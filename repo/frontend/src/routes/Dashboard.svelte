<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import AlertBanner from '$components/AlertBanner.svelte';
  import { inventoryStore, ledgerStore, alertStore, loadInventory, loadLedger, checkSafetyStock, setAlerts } from '$modules/inventory';
  import { orderStore, loadOrders } from '$modules/orders';
  import { fileStore, loadFiles } from '$modules/files';

  let loading = true;

  onMount(async () => {
    await Promise.all([loadInventory(), loadOrders(), loadFiles(), loadLedger()]);
    const alerts = await checkSafetyStock();
    setAlerts(alerts);
    loading = false;
  });

  $: stockCount = $inventoryStore.length;
  $: orderCount = $orderStore.length;
  $: fileCount = $fileStore.length;
  $: alertCount = $alertStore.length;
  $: recentLedger = $ledgerStore.slice(-5).reverse();
</script>

<PageHeader title="Dashboard" />

<AlertBanner alerts={$alertStore} />

<div class="dashboard-grid">
  <div class="card">
    <h3>Inventory</h3>
    <p class="card-value">{loading ? '...' : stockCount}</p>
    <p class="card-label">Stock records</p>
  </div>
  <div class="card">
    <h3>Orders</h3>
    <p class="card-value">{loading ? '...' : orderCount}</p>
    <p class="card-label">Total orders</p>
  </div>
  <div class="card">
    <h3>Files</h3>
    <p class="card-value">{loading ? '...' : fileCount}</p>
    <p class="card-label">Managed files</p>
  </div>
  <div class="card" class:alert={alertCount > 0}>
    <h3>Alerts</h3>
    <p class="card-value">{loading ? '...' : alertCount}</p>
    <p class="card-label">Safety stock alerts</p>
  </div>
</div>

{#if recentLedger.length > 0}
  <div class="recent-section">
    <h3>Recent Activity</h3>
    <table class="recent-table">
      <thead><tr><th>Time</th><th>Reason</th><th>SKU</th><th>Qty</th></tr></thead>
      <tbody>
        {#each recentLedger as entry}
          <tr>
            <td>{new Date(entry.timestamp).toLocaleString()}</td>
            <td>{entry.reasonCode}</td>
            <td>{entry.skuId}</td>
            <td>{entry.quantity}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); padding: var(--spacing-md); }
  .card { padding: var(--spacing-lg); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .card.alert { border-color: var(--color-warning); background: #fffbeb; }
  .card h3 { color: var(--color-muted); font-size: 0.875rem; text-transform: uppercase; }
  .card-value { font-size: 2rem; font-weight: 700; margin: var(--spacing-xs) 0; }
  .card-label { color: var(--color-muted); font-size: 0.875rem; }
  .recent-section { padding: var(--spacing-md); }
  .recent-section h3 { font-size: 0.875rem; margin-bottom: var(--spacing-sm); }
  .recent-table { width: 100%; border-collapse: collapse; }
  .recent-table th, .recent-table td { padding: var(--spacing-xs) var(--spacing-sm); text-align: left; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; }
  .recent-table th { background: var(--color-surface); font-weight: 600; }
</style>
