<script lang="ts">
  export let title: string;
</script>

<header class="page-header">
  <h2>{title}</h2>
  <div class="actions">
    <slot />
  </div>
</header>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }
  h2 { font-size: 1.25rem; font-weight: 600; }
  .actions { display: flex; gap: var(--spacing-sm); align-items: center; }
  .actions :global(a) { color: var(--color-primary); text-decoration: none; font-size: 0.875rem; }
</style>
