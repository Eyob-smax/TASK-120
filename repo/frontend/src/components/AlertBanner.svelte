<script lang="ts">
  import type { SafetyStockAlert } from '$lib/types/inventory';

  export let alerts: SafetyStockAlert[] = [];
  export let onDismiss: (() => void) | undefined = undefined;

  $: hasAlerts = alerts.length > 0;
</script>

{#if hasAlerts}
  <div class="alert-banner" role="alert">
    <strong>Low Stock Alert ({alerts.length})</strong>
    <ul>
      {#each alerts.slice(0, 5) as alert}
        <li>SKU {alert.skuId} in warehouse {alert.warehouseId}: {alert.currentStock}/{alert.threshold} units</li>
      {/each}
      {#if alerts.length > 5}
        <li>...and {alerts.length - 5} more</li>
      {/if}
    </ul>
    {#if onDismiss}
      <button on:click={onDismiss} aria-label="Dismiss">x</button>
    {/if}
  </div>
{/if}

<style>
  .alert-banner {
    padding: var(--spacing-sm) var(--spacing-md);
    background: #fffbeb;
    border: 1px solid #fed7aa;
    border-radius: var(--radius-sm);
    margin: var(--spacing-sm) var(--spacing-md);
    position: relative;
  }
  strong { color: var(--color-warning); font-size: 0.875rem; }
  ul { list-style: none; margin-top: var(--spacing-xs); }
  li { font-size: 0.8rem; color: var(--color-text); padding: 1px 0; }
  button { position: absolute; top: var(--spacing-xs); right: var(--spacing-sm); background: none; border: none; cursor: pointer; }
</style>
