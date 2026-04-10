<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import ProgressBar from '$components/ProgressBar.svelte';
  import { ingestFile, loadFiles, completeTransfer, pauseTransfer, resumeTransfer, ChunkScheduler, createVersion } from '$modules/files';
  import { getCurrentSession } from '$lib/security/auth.service';
  import { PreferenceStorage } from '$modules/preferences/storage';
  import { DEFAULT_BANDWIDTH_CAP } from '$lib/constants';

  export let open = false;

  const toast: any = getContext('toast');

  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;
  let uploading = false;
  let progress = 0;
  let totalChunks = 0;
  let completedChunks = 0;
  let error = '';
  let deduplicated = false;
  let paused = false;
  let scheduler: ChunkScheduler | null = null;
  let sessionId: string | null = null;

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    selectedFile = target.files?.[0] ?? null;
    deduplicated = false;
    error = '';
    progress = 0;
  }

  async function handleConfirm() {
    if (uploading) return;
    if (!selectedFile) return;
    error = '';
    uploading = true;
    progress = 0;
    paused = false;

    const userId = getCurrentSession()?.userId ?? 'unknown';

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = await ingestFile(selectedFile.name, selectedFile.size, selectedFile.type, buffer, userId);

      if (result.deduplicated) {
        deduplicated = true;
        toast?.addToast('File already exists (deduplicated)', 'info');
        uploading = false;
        await loadFiles();
        selectedFile = null;
        open = false;
        return;
      }

      // Run real chunk scheduling
      if (result.session) {
        totalChunks = result.session.totalChunks;
        completedChunks = 0;
        sessionId = result.session.id;
        scheduler = new ChunkScheduler();

        // Apply persisted bandwidth cap from settings
        const prefs = new PreferenceStorage();
        const savedCap = prefs.get<number>('bandwidth:cap');
        if (savedCap && savedCap > 0) {
          scheduler.setBandwidthCap(savedCap);
        }

        // Create the version record first so chunks can be tagged with its id.
        // This must happen before scheduleChunks to ensure version-scoped deduplication.
        const { version } = await createVersion(result.file.id, result.file.sha256, result.file.size, userId);

        await scheduler.scheduleChunks(result.session.id, buffer, (completed, total) => {
          completedChunks = completed;
          totalChunks = total;
          progress = Math.round((completed / total) * 100);
        }, version.id);

        // If paused mid-upload, don't complete — user can resume from Files page
        if (paused) {
          toast?.addToast('Upload paused. Resume from the Files page.', 'info');
          uploading = false;
          scheduler = null;
          sessionId = null;
          open = false;
          return;
        }

        // Complete the transfer session
        await completeTransfer(result.session.id);
      }

      toast?.addToast(`File "${selectedFile.name}" uploaded (${totalChunks} chunks)`, 'success');
      await loadFiles();
      selectedFile = null;
      open = false;
    } catch (e: any) {
      error = e.message || 'Upload failed';
    } finally {
      uploading = false;
      scheduler = null;
      sessionId = null;
    }
  }

  async function handlePause() {
    if (!scheduler || !sessionId) return;
    if (!paused) {
      scheduler.pause();
      await pauseTransfer(sessionId);
      paused = true;
    } else {
      await resumeTransfer(sessionId);
      scheduler.resume();
      paused = false;
    }
  }
</script>

<Modal {open} title="Upload File" confirmLabel={uploading ? 'Uploading...' : 'Upload'} confirmDisabled={uploading} on:close={() => { open = false; }} on:confirm={handleConfirm}>
  {#if error}<div class="form-error">{error}</div>{/if}
  {#if deduplicated}<div class="dedup-notice">Identical file already exists. Deduplicated.</div>{/if}

  <input type="file" bind:this={fileInput} on:change={handleFileSelect} />

  {#if selectedFile}
    <div class="file-info">
      <p><strong>{selectedFile.name}</strong></p>
      <p>{(selectedFile.size / 1024).toFixed(1)} KB - {selectedFile.type || 'unknown type'}</p>
    </div>
  {/if}

  {#if uploading}
    <ProgressBar value={progress} max={100} label="Upload" />
    <p class="chunk-status">{completedChunks}/{totalChunks} chunks</p>
    <button class="pause-btn" on:click={handlePause}>
      {paused ? 'Resume' : 'Pause'}
    </button>
  {/if}
</Modal>

<style>
  input[type="file"] { margin-bottom: var(--spacing-md); }
  .file-info { padding: var(--spacing-sm); background: var(--color-surface); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); }
  .file-info p { font-size: 0.85rem; }
  .dedup-notice { padding: var(--spacing-xs); background: #eff6ff; color: var(--color-primary); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
  .chunk-status { font-size: 0.8rem; color: var(--color-muted); text-align: center; margin: var(--spacing-xs) 0; }
  .pause-btn { width: 100%; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
</style>
