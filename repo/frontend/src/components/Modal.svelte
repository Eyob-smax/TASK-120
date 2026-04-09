<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';
  export let showFooter = true;
  export let confirmDisabled = false;

  const dispatch = createEventDispatcher<{ close: void; confirm: void }>();

  function close() { dispatch('close'); }
  function confirm() { dispatch('confirm'); }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="modal-overlay" on:click={close} role="presentation"></div>
  <div class="modal" role="dialog" aria-label={title}>
    <header class="modal-header">
      <h3>{title}</h3>
      <button class="modal-close" on:click={close} aria-label="Close">x</button>
    </header>
    <div class="modal-body">
      <slot />
    </div>
    {#if showFooter}
      <footer class="modal-footer">
        <slot name="footer">
          <button class="btn-cancel" on:click={close}>{cancelLabel}</button>
          <button class="btn-confirm" on:click={confirm} disabled={confirmDisabled}>{confirmLabel}</button>
        </slot>
      </footer>
    {/if}
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 300;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: var(--radius-lg);
    z-index: 301;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
  }
  .modal-header h3 { font-size: 1rem; }
  .modal-close { background: none; border: none; cursor: pointer; font-size: 1.2rem; }
  .modal-body { flex: 1; overflow-y: auto; padding: var(--spacing-md); }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--color-border);
  }
  .btn-cancel {
    padding: var(--spacing-xs) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
  }
  .btn-confirm {
    padding: var(--spacing-xs) var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--color-primary);
    color: white;
    cursor: pointer;
  }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
