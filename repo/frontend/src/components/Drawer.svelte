<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="drawer-overlay" on:click={close} role="presentation"></div>
  <aside class="drawer" role="dialog" aria-label={title}>
    <header class="drawer-header">
      <h3>{title}</h3>
      <button class="drawer-close" on:click={close} aria-label="Close">x</button>
    </header>
    <div class="drawer-body">
      <slot />
    </div>
  </aside>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 200;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    max-width: 90vw;
    background: white;
    z-index: 201;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0,0,0,0.1);
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
  }
  .drawer-header h3 { font-size: 1rem; }
  .drawer-close { background: none; border: none; cursor: pointer; font-size: 1.2rem; }
  .drawer-body { flex: 1; overflow-y: auto; padding: var(--spacing-md); }
</style>
