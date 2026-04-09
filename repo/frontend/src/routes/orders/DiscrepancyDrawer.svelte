<script lang="ts">
  import { getContext } from 'svelte';
  import Drawer from '$components/Drawer.svelte';
  import {
    reportDiscrepancy,
    reviewDiscrepancy,
    verifyDiscrepancy,
    resolveDiscrepancy,
    getDiscrepanciesByTask,
  } from '$modules/orders';
  import { DiscrepancyState } from '$lib/types/enums';
  import type { Discrepancy, DiscrepancyAttachment } from '$lib/types/orders';
  import { getCurrentSession } from '$lib/security/auth.service';

  export let open = false;
  export let taskId = '';

  const toast: any = getContext('toast');

  let discrepancies: Discrepancy[] = [];
  let description = '';
  let verificationNotes = '';
  let error = '';
  let reportFiles: FileList | null = null;
  let verifyFiles: FileList | null = null;
  let reportFileInput: HTMLInputElement;
  let verifyFileInput: HTMLInputElement;

  function filesToAttachments(files: FileList | null, discrepancyId: string): DiscrepancyAttachment[] {
    if (!files) return [];
    return Array.from(files).map(f => ({
      id: crypto.randomUUID(),
      discrepancyId,
      fileId: crypto.randomUUID(),
      type: f.type || 'application/octet-stream',
      name: f.name,
      addedAt: new Date().toISOString(),
    }));
  }

  $: if (open && taskId) loadDiscrepancies();

  async function loadDiscrepancies() {
    discrepancies = await getDiscrepanciesByTask(taskId);
  }

  async function handleReport() {
    error = '';
    try {
      const attachments = filesToAttachments(reportFiles, '');
      await reportDiscrepancy(taskId, getCurrentSession()?.userId ?? 'unknown', description, attachments);
      description = '';
      reportFiles = null;
      if (reportFileInput) reportFileInput.value = '';
      await loadDiscrepancies();
      toast?.addToast('Discrepancy reported', 'warning');
    } catch (e: any) { error = e.message; }
  }

  async function handleReview(id: string) {
    try {
      await reviewDiscrepancy(id);
      await loadDiscrepancies();
    } catch (e: any) { error = e.message; }
  }

  async function handleVerify(id: string) {
    error = '';
    try {
      const attachments = filesToAttachments(verifyFiles, id);
      await verifyDiscrepancy(id, getCurrentSession()?.userId ?? 'unknown', verificationNotes || 'Verified', attachments);
      verificationNotes = '';
      verifyFiles = null;
      if (verifyFileInput) verifyFileInput.value = '';
      await loadDiscrepancies();
      toast?.addToast('Discrepancy verified', 'success');
    } catch (e: any) { error = e.message; }
  }

  async function handleResolve(id: string) {
    try {
      await resolveDiscrepancy(id);
      await loadDiscrepancies();
      toast?.addToast('Discrepancy resolved', 'success');
    } catch (e: any) { error = e.message; }
  }

  function stateLabel(state: DiscrepancyState): string {
    return state.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
</script>

<Drawer {open} title="Discrepancies — Task {taskId}" on:close={() => { open = false; }}>
  {#if error}<div class="form-error">{error}</div>{/if}

  <div class="report-form">
    <h4>Report New</h4>
    <div class="report-row">
      <input type="text" placeholder="Description" bind:value={description} />
      <button on:click={handleReport} disabled={!description.trim()}>Report</button>
    </div>
    <input type="file" multiple bind:this={reportFileInput}
           on:change={(e) => { reportFiles = e.target.files; }} />
    {#if reportFiles && reportFiles.length > 0}
      <div class="file-list">
        {#each Array.from(reportFiles) as f}
          <span class="file-chip">{f.name}</span>
        {/each}
      </div>
    {/if}
  </div>

  <div class="discrepancy-list">
    {#each discrepancies as d}
      <div class="disc-card">
        <div class="disc-header">
          <span class="disc-state" data-state={d.state}>{stateLabel(d.state)}</span>
          <span class="disc-date">{new Date(d.reportedAt).toLocaleString()}</span>
        </div>
        <p class="disc-desc">{d.description}</p>
        {#if d.verificationNotes}<p class="disc-notes">Verification: {d.verificationNotes}</p>{/if}
        {#if d.attachments && d.attachments.length > 0}
          <div class="attachment-list">
            <span class="attachment-label">Attachments:</span>
            {#each d.attachments as att}
              <span class="attachment-chip">{att.name}</span>
            {/each}
          </div>
        {/if}
        <div class="disc-actions">
          {#if d.state === DiscrepancyState.Opened}
            <button on:click={() => handleReview(d.id)}>Review</button>
          {/if}
          {#if d.state === DiscrepancyState.UnderReview}
            <input type="text" placeholder="Verification notes" bind:value={verificationNotes} />
            <input type="file" multiple bind:this={verifyFileInput}
                   on:change={(e) => { verifyFiles = e.target.files; }} />
            <button on:click={() => handleVerify(d.id)}>Verify</button>
          {/if}
          {#if d.state === DiscrepancyState.Verified}
            <button on:click={() => handleResolve(d.id)}>Resolve</button>
          {/if}
        </div>
      </div>
    {/each}
    {#if discrepancies.length === 0}
      <p class="empty">No discrepancies for this task</p>
    {/if}
  </div>
</Drawer>

<style>
  .report-form { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); }
  .report-row { display: flex; gap: var(--spacing-xs); }
  .report-row input[type="text"] { flex: 1; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .report-form button { padding: var(--spacing-xs) var(--spacing-sm); background: var(--color-warning); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; }
  .report-form input[type="file"] { font-size: 0.8rem; }
  .file-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .file-chip { font-size: 0.75rem; padding: 2px 6px; background: #eff6ff; border-radius: var(--radius-sm); color: var(--color-primary); }
  .attachment-list { margin-top: var(--spacing-xs); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .attachment-label { font-size: 0.75rem; font-weight: 600; color: var(--color-muted); }
  .attachment-chip { font-size: 0.75rem; padding: 2px 6px; background: #f3f4f6; border-radius: var(--radius-sm); }
  h4 { font-size: 0.85rem; margin-bottom: var(--spacing-xs); }
  .disc-card { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--spacing-sm); margin-bottom: var(--spacing-sm); }
  .disc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); }
  .disc-state { font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; font-weight: 600; background: #e5e7eb; }
  .disc-date { font-size: 0.75rem; color: var(--color-muted); }
  .disc-desc { font-size: 0.85rem; margin-bottom: var(--spacing-xs); }
  .disc-notes { font-size: 0.8rem; color: var(--color-muted); font-style: italic; }
  .disc-actions { display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-xs); }
  .disc-actions input { flex: 1; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.8rem; }
  .disc-actions button { padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
  .empty { color: var(--color-muted); font-size: 0.85rem; text-align: center; padding: var(--spacing-md); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
