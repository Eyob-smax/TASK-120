<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import Toast from './Toast.svelte';

  interface ToastItem {
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  }

  let nextId = 0;
  const toasts = writable<ToastItem[]>([]);

  function addToast(message: string, type: ToastItem['type'] = 'info', duration = 4000) {
    const id = nextId++;
    toasts.update(items => [...items, { id, message, type, duration }]);
  }

  function removeToast(id: number) {
    toasts.update(items => items.filter(t => t.id !== id));
  }

  setContext('toast', { addToast });
</script>

<slot />

<div class="toast-container" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <Toast
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      on:dismiss={() => removeToast(toast.id)}
    />
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: var(--spacing-md);
    right: var(--spacing-md);
    z-index: 500;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
</style>
