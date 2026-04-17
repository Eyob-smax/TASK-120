<script lang="ts">
  import { getContext } from 'svelte';
  import { getRecycleBinContents, optimisticRestoreFile, purgeExpired } from '$modules/files';
  import type { RecycleBinEntry } from '$lib/types/files';

  const toast: any = getContext('toast');

  let entries: RecycleBinEntry[] = [];
  let loading = true;

  export async function load() {
    loading = true;
    entries = await getRecycleBinContents();
    loading = false;
  }

  async function handleRestore(entryId: string) {
    try {
      await optimisticRestoreFile(entryId);
      await load();
      toast?.addToast('File restored', 'success');
    } catch (e: any) {
      toast?.addToast(e.message || 'Restore failed', 'error');
    }
  }

  async function handlePurge() {
    try {
      const count = await purgeExpired();
      await load();
      toast?.addToast(`Purged ${count} expired entries`, 'info');
    } catch (e: any) {
      toast?.addToast(e.message || 'Purge failed', 'error');
    }
  }
</script>

<div class="recycle-bin">
  <div class="bin-header">
    <h4>Recycle Bin</h4>
    <button on:click={handlePurge}>Purge Expired</button>
  </div>

  {#if loading}
    <p>Loading...</p>
  {:else if entries.length === 0}
    <p class="empty">Recycle bin is empty</p>
  {:else}
    <ul class="bin-list">
      {#each entries as entry}
        <li>
          <div>
            <strong>{entry.originalName}</strong>
            <span class="meta">Deleted {new Date(entry.deletedAt).toLocaleDateString()} - Expires {new Date(entry.expiresAt).toLocaleDateString()}</span>
          </div>
          <button on:click={() => handleRestore(entry.id)}>Restore</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .bin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); }
  h4 { font-size: 0.875rem; }
  .bin-header button { padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
  .bin-list { list-style: none; }
  li { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm); border-bottom: 1px solid var(--color-border); }
  .meta { display: block; font-size: 0.75rem; color: var(--color-muted); }
  li button { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
  .empty { color: var(--color-muted); text-align: center; padding: var(--spacing-md); }
</style>
