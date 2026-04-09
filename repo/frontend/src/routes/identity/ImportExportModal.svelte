<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { importProfiles, exportProfiles } from '$modules/identity/identity.service';

  export let open = false;
  export let mode: 'import' | 'export' = 'import';

  const toast: any = getContext('toast');

  let fileInput: HTMLInputElement;
  let importing = false;
  let error = '';
  let exportFormat: 'json' | 'csv' = 'json';

  async function handleImport(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    error = '';
    importing = true;
    try {
      const text = await file.text();
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const result = await importProfiles(text, format);

      if (result.errors.length > 0) {
        toast?.addToast(`Imported ${result.importedCount}, skipped ${result.skippedCount}`, 'warning');
      } else {
        toast?.addToast(`Imported ${result.importedCount} profiles`, 'success');
      }
      open = false;
    } catch (e: any) {
      error = e.message || 'Import failed';
    } finally {
      importing = false;
    }
  }

  async function handleExport() {
    try {
      const data = await exportProfiles([], exportFormat);
      const mimeType = exportFormat === 'json' ? 'application/json' : 'text/csv';
      const ext = exportFormat === 'json' ? 'json' : 'csv';
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profiles-export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast?.addToast(`Exported profiles as ${ext.toUpperCase()}`, 'success');
      open = false;
    } catch (e: any) {
      error = e.message || 'Export failed';
    }
  }
</script>

<Modal {open} title={mode === 'import' ? 'Import Profiles' : 'Export Profiles'} showFooter={mode === 'export'} confirmLabel="Export" on:close={() => { open = false; }} on:confirm={handleExport}>
  {#if error}<div class="form-error">{error}</div>{/if}

  {#if mode === 'import'}
    <p>Select a JSON or CSV file with profile data.</p>
    <input type="file" accept=".json,.csv" bind:this={fileInput} on:change={handleImport} />
    {#if importing}<p>Importing...</p>{/if}
  {:else}
    <p>Export all profiles.</p>
    <label>
      Format:
      <select bind:value={exportFormat}>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>
    </label>
  {/if}
</Modal>

<style>
  p { font-size: 0.875rem; margin-bottom: var(--spacing-sm); color: var(--color-muted); }
  label { display: block; font-size: 0.875rem; margin-top: var(--spacing-sm); }
  select { margin-left: var(--spacing-sm); padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
