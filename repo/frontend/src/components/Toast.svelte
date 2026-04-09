<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let message: string;
  export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  export let duration = 4000;

  const dispatch = createEventDispatcher<{ dismiss: void }>();

  onMount(() => {
    if (duration > 0) {
      const timer = setTimeout(() => dispatch('dismiss'), duration);
      return () => clearTimeout(timer);
    }
  });

  const colors: Record<string, string> = {
    success: '#f0fdf4',
    error: '#fef2f2',
    warning: '#fffbeb',
    info: '#eff6ff',
  };
  const borders: Record<string, string> = {
    success: '#bbf7d0',
    error: '#fecaca',
    warning: '#fed7aa',
    info: '#bfdbfe',
  };
</script>

<div
  class="toast"
  role="status"
  style="background:{colors[type]};border-color:{borders[type]}"
>
  <span>{message}</span>
  <button on:click={() => dispatch('dismiss')} aria-label="Dismiss">x</button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    min-width: 280px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    margin-left: var(--spacing-sm);
  }
</style>
