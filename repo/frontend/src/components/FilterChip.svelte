<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label: string;
  export let value: string = '';

  const dispatch = createEventDispatcher<{ remove: void }>();
</script>

<span class="filter-chip">
  <span class="chip-text">{label}{value ? `: ${value}` : ''}</span>
  <button class="chip-remove" on:click={() => dispatch('remove')} aria-label="Remove filter {label}">
    x
  </button>
</span>

<style>
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: #dbeafe;
    color: var(--color-primary);
    border-radius: 9999px;
    font-size: 0.8rem;
  }
  .chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-primary);
    font-weight: 600;
    padding: 0 2px;
    line-height: 1;
  }
</style>
