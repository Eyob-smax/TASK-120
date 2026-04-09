<script lang="ts">
  import { getContext } from 'svelte';
  import Drawer from '$components/Drawer.svelte';
  import { getVersionHistory, rollbackToVersion } from '$modules/files';
  import { getCurrentSession } from '$lib/security/auth.service';
  import type { FileVersion } from '$lib/types/files';

  export let open = false;
  export let fileId = '';

  const toast: any = getContext('toast');

  let versions: FileVersion[] = [];
  let loading = true;
  let error = '';

  $: if (open && fileId) loadVersions();

  async function loadVersions() {
    loading = true;
    versions = await getVersionHistory(fileId);
    loading = false;
  }

  async function handleRollback(versionId: string, versionNumber: number) {
    error = '';
    try {
      await rollbackToVersion(fileId, versionId, getCurrentSession()?.userId ?? 'unknown');
      await loadVersions();
      toast?.addToast(`Rolled back to version ${versionNumber}`, 'success');
    } catch (e: any) {
      error = e.message || 'Rollback failed';
    }
  }
</script>

<Drawer {open} title="Version History" on:close={() => { open = false; }}>
  {#if error}<div class="form-error">{error}</div>{/if}

  {#if loading}
    <p>Loading versions...</p>
  {:else if versions.length === 0}
    <p class="empty">No versions found</p>
  {:else}
    <ul class="version-list">
      {#each versions as v, i}
        <li class="version-item">
          <div class="version-info">
            <strong>v{v.versionNumber}</strong>
            <span class="version-date">{new Date(v.createdAt).toLocaleString()}</span>
            <span class="version-size">{(v.size / 1024).toFixed(1)} KB</span>
          </div>
          {#if i > 0}
            <button on:click={() => handleRollback(v.id, v.versionNumber)}>Rollback</button>
          {:else}
            <span class="current-badge">Current</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</Drawer>

<style>
  .version-list { list-style: none; }
  .version-item { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm); border-bottom: 1px solid var(--color-border); }
  .version-info { display: flex; flex-direction: column; gap: 2px; }
  .version-date, .version-size { font-size: 0.75rem; color: var(--color-muted); }
  button { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
  .current-badge { font-size: 0.75rem; padding: 2px 8px; background: #dbeafe; color: var(--color-primary); border-radius: 9999px; }
  .empty { color: var(--color-muted); text-align: center; padding: var(--spacing-md); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
