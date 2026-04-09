<script lang="ts">
  import { getContext } from 'svelte';
  import { PreferenceStorage } from '$modules/preferences/storage';

  const toast: any = getContext('toast');
  const storage = new PreferenceStorage();

  let zones: string[] = storage.get<string[]>('pickpath:zones') ?? ['A', 'B', 'C', 'D'];
  let newZone = '';

  function addZone() {
    if (!newZone.trim() || zones.includes(newZone.trim().toUpperCase())) return;
    zones = [...zones, newZone.trim().toUpperCase()];
    newZone = '';
  }

  function removeZone(index: number) {
    zones = zones.filter((_, i) => i !== index);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const copy = [...zones];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    zones = copy;
  }

  function save() {
    storage.set('pickpath:zones', zones);
    toast?.addToast('Zone priority saved', 'success');
  }
</script>

<div class="zone-settings">
  <h4>Pick-Path Zone Priority</h4>
  <p>Configure the zone ordering for pick-path optimization. Higher position = higher priority.</p>

  <ol class="zone-list">
    {#each zones as zone, i}
      <li>
        <span class="zone-name">{zone}</span>
        <div class="zone-actions">
          <button on:click={() => moveUp(i)} disabled={i === 0}>Up</button>
          <button on:click={() => removeZone(i)}>Remove</button>
        </div>
      </li>
    {/each}
  </ol>

  <div class="add-zone">
    <input placeholder="Zone name" bind:value={newZone} />
    <button on:click={addZone}>Add</button>
  </div>

  <button class="save-btn" on:click={save}>Save Priority</button>
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  p { font-size: 0.8rem; color: var(--color-muted); margin-bottom: var(--spacing-sm); }
  .zone-list { padding-left: var(--spacing-md); }
  li { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs) 0; }
  .zone-name { font-weight: 600; }
  .zone-actions { display: flex; gap: var(--spacing-xs); }
  .zone-actions button { padding: 1px 6px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.75rem; }
  .add-zone { display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-sm); }
  .add-zone input { padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 120px; }
  .add-zone button { padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; }
  .save-btn { margin-top: var(--spacing-md); padding: var(--spacing-xs) var(--spacing-md); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; }
</style>
