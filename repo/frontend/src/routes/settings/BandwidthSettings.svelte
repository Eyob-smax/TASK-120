<script lang="ts">
  import { getContext } from 'svelte';
  import { PreferenceStorage } from '$modules/preferences/storage';
  import { DEFAULT_BANDWIDTH_CAP } from '$lib/constants';

  const toast: any = getContext('toast');
  const storage = new PreferenceStorage();

  let capMBps = (storage.get<number>('bandwidth:cap') ?? DEFAULT_BANDWIDTH_CAP) / (1024 * 1024);

  function save() {
    const bytes = Math.round(capMBps * 1024 * 1024);
    storage.set('bandwidth:cap', bytes);
    toast?.addToast(`Bandwidth cap set to ${capMBps} MB/s`, 'success');
  }
</script>

<div class="bandwidth-settings">
  <h4>File Transfer Bandwidth</h4>
  <p>Limit the speed of file chunk processing. This is an application-managed throughput target.</p>
  <label>
    Cap (MB/s)
    <input type="number" bind:value={capMBps} min="0.1" step="0.5" />
  </label>
  <button on:click={save}>Save</button>
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  p { font-size: 0.8rem; color: var(--color-muted); margin-bottom: var(--spacing-sm); }
  label { display: block; font-size: 0.85rem; margin-bottom: var(--spacing-sm); }
  input { display: block; width: 120px; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  button { padding: var(--spacing-xs) var(--spacing-md); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; }
</style>
