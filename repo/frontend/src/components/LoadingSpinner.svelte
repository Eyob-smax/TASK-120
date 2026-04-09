<script lang="ts">
  export let message = 'Loading...';
</script>

<div class="loading" role="status">
  <div class="spinner" aria-hidden="true"></div>
  {#if message}<p>{message}</p>{/if}
</div>

<style>
  .loading { display: flex; flex-direction: column; align-items: center; padding: var(--spacing-xl); }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: var(--spacing-sm);
  }
  p { color: var(--color-muted); font-size: 0.875rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
