<script lang="ts">
  export let message: string;
  export let onDismiss: (() => void) | undefined = undefined;
</script>

<div class="error-banner" role="alert">
  <span>{message}</span>
  {#if onDismiss}
    <button on:click={onDismiss} aria-label="Dismiss error">x</button>
  {/if}
</div>

<style>
  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: #fef2f2;
    color: var(--color-danger);
    border: 1px solid #fecaca;
    border-radius: var(--radius-sm);
    margin: var(--spacing-sm);
  }
  button {
    background: none;
    border: none;
    color: var(--color-danger);
    cursor: pointer;
    font-weight: 600;
  }
</style>
