<script lang="ts">
  export let message = 'No data available';
  export let actionLabel = '';
</script>

<div class="empty-state">
  <div class="empty-icon">--</div>
  <p>{message}</p>
  {#if actionLabel}
    <button on:click><slot name="action">{actionLabel}</slot></button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl) var(--spacing-md);
    color: var(--color-muted);
  }
  .empty-icon { font-size: 2rem; margin-bottom: var(--spacing-sm); }
  p { margin-bottom: var(--spacing-md); }
  button {
    padding: var(--spacing-xs) var(--spacing-md);
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
</style>
