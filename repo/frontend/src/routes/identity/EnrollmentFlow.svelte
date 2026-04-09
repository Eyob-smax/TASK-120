<script lang="ts">
  import { onDestroy, getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { initCamera, captureFrame, stopCamera } from '$modules/identity/capture.service';
  import { runAllQualityChecks } from '$modules/identity/quality.service';
  import { LivenessFlow } from '$modules/identity/liveness.service';
  import { generateVector, encryptAndStore } from '$modules/identity/vector.service';
  import { enrollProfile, startEnrollment, updateSessionStatus } from '$modules/identity/identity.service';
  import { loadProfiles } from '$modules/identity/identity.store';
  import type { QualityResult } from '$lib/types/identity';

  export let open = false;

  const toast: any = getContext('toast');

  let step: 'name' | 'camera' | 'quality' | 'liveness' | 'processing' | 'done' | 'error' = 'name';
  let name = '';
  let error = '';
  let stream: MediaStream | null = null;
  let videoEl: HTMLVideoElement;
  let qualityResults: QualityResult[] = [];
  let livenessPrompt = '';

  async function startCapture() {
    if (!name.trim()) { error = 'Name is required'; return; }
    error = '';
    step = 'camera';
    try {
      stream = await initCamera();
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
      }
      step = 'quality';
      await checkQuality();
    } catch (e: any) {
      error = e.message || 'Camera initialization failed';
      step = 'error';
    }
  }

  async function checkQuality() {
    if (!videoEl) return;
    const frame = captureFrame(videoEl);
    qualityResults = runAllQualityChecks(frame, videoEl.videoWidth, videoEl.videoHeight);

    const allPassed = qualityResults.every(r => r.passed);
    if (!allPassed) {
      error = qualityResults.filter(r => !r.passed).map(r => r.details).join('; ');
      return;
    }

    error = '';
    step = 'liveness';
    await runLiveness();
  }

  async function runLiveness() {
    if (!videoEl) return;
    const flow = new LivenessFlow();

    const attempt = await flow.start(videoEl, (msg) => {
      livenessPrompt = msg;
    });

    if (attempt.result !== 'pass') {
      error = `Liveness check failed: ${attempt.result.replace(/_/g, ' ')}`;
      step = 'error';
      return;
    }

    step = 'processing';
    await processEnrollment();
  }

  async function processEnrollment() {
    try {
      const profile = await enrollProfile(name);
      const session = await startEnrollment(profile.id);

      const frame = captureFrame(videoEl);
      const vector = generateVector(frame);
      await encryptAndStore(profile.id, vector);
      await updateSessionStatus(session.id, 'completed');

      await loadProfiles();
      toast?.addToast(`Profile "${name}" enrolled successfully`, 'success');
      step = 'done';
      cleanup();
      open = false;
    } catch (e: any) {
      error = e.message || 'Enrollment failed';
      step = 'error';
    }
  }

  function cleanup() {
    if (stream) { stopCamera(stream); stream = null; }
    name = ''; error = ''; qualityResults = []; livenessPrompt = '';
    step = 'name';
  }

  function handleClose() {
    cleanup();
    open = false;
  }

  onDestroy(() => { if (stream) stopCamera(stream); });
</script>

<Modal {open} title="Face Enrollment" showFooter={false} on:close={handleClose}>
  {#if error}
    <div class="error-msg" role="alert">{error}</div>
  {/if}

  {#if step === 'name'}
    <label>Profile Name <input bind:value={name} placeholder="Enter name" /></label>
    <button class="primary-btn" on:click={startCapture}>Start Enrollment</button>

  {:else if step === 'camera' || step === 'quality'}
    <div class="camera-container">
      <video bind:this={videoEl} autoplay playsinline muted></video>
    </div>
    {#if qualityResults.length > 0}
      <div class="quality-results">
        {#each qualityResults as qr}
          <div class="qr-item" class:pass={qr.passed} class:fail={!qr.passed}>
            {qr.passed ? 'PASS' : 'FAIL'}: {qr.details}
          </div>
        {/each}
      </div>
      {#if error}
        <button class="primary-btn" on:click={checkQuality}>Retry Quality Check</button>
      {/if}
    {/if}

  {:else if step === 'liveness'}
    <div class="camera-container">
      <video bind:this={videoEl} autoplay playsinline muted></video>
    </div>
    <p class="liveness-prompt">{livenessPrompt}</p>

  {:else if step === 'processing'}
    <p class="processing">Processing enrollment...</p>

  {:else if step === 'done'}
    <p class="success">Enrollment complete!</p>

  {:else if step === 'error'}
    <button class="primary-btn" on:click={() => { error = ''; step = 'name'; }}>Try Again</button>
  {/if}
</Modal>

<style>
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; font-weight: 500; }
  input { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .primary-btn { width: 100%; padding: var(--spacing-sm); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; margin-top: var(--spacing-sm); }
  .camera-container { text-align: center; margin-bottom: var(--spacing-sm); }
  video { width: 100%; max-height: 300px; border-radius: var(--radius-sm); background: #000; }
  .quality-results { margin-top: var(--spacing-sm); }
  .qr-item { padding: 2px 8px; font-size: 0.8rem; margin-bottom: 2px; border-radius: var(--radius-sm); }
  .qr-item.pass { background: #f0fdf4; color: var(--color-success); }
  .qr-item.fail { background: #fef2f2; color: var(--color-danger); }
  .liveness-prompt { text-align: center; font-weight: 500; padding: var(--spacing-sm); background: #eff6ff; border-radius: var(--radius-sm); }
  .processing { text-align: center; color: var(--color-muted); padding: var(--spacing-md); }
  .success { text-align: center; color: var(--color-success); padding: var(--spacing-md); font-weight: 600; }
  .error-msg { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
