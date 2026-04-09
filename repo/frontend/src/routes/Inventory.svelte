<script lang="ts">
  import { onMount } from 'svelte';
  import { querystring } from 'svelte-spa-router';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import AlertBanner from '$components/AlertBanner.svelte';
  import { inventoryStore, alertStore, loadInventory, checkSafetyStock, setAlerts } from '$modules/inventory';
  import { currentRole } from '$lib/stores/auth.store';
  import { canMutate } from '$lib/security/permissions';
  import ReceiveModal from './inventory/ReceiveModal.svelte';
  import ShipModal from './inventory/ShipModal.svelte';
  import TransferModal from './inventory/TransferModal.svelte';
  import CycleCountModal from './inventory/CycleCountModal.svelte';

  let loading = true;
  let showReceive = false;
  let showShip = false;
  let showTransfer = false;
  let showCount = false;

  onMount(async () => {
    await loadInventory();
    const alerts = await checkSafetyStock();
    setAlerts(alerts);
    loading = false;
  });

  $: role = $currentRole;
  $: canWrite = role ? canMutate(role, 'inventory.create') : false;

  // Consume global search query from URL
  $: searchQuery = $querystring ? new URLSearchParams($querystring).get('q') ?? '' : '';
  $: filteredData = searchQuery
    ? $inventoryStore.filter(r =>
        String(r.skuId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.binId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.warehouseId).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : $inventoryStore;

  const columns = [
    { key: 'skuId', label: 'SKU', sortable: true },
    { key: 'binId', label: 'Bin', sortable: true },
    { key: 'warehouseId', label: 'Warehouse', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
  ];
</script>

<PageHeader title="Inventory">
  {#if canWrite}
    <button on:click={() => showReceive = true}>Receive</button>
    <button on:click={() => showShip = true}>Ship</button>
    <button on:click={() => showTransfer = true}>Transfer</button>
    <button on:click={() => showCount = true}>Cycle Count</button>
  {/if}
  <a href="#/inventory/ledger">View Ledger</a>
</PageHeader>

<AlertBanner alerts={$alertStore} />

{#if searchQuery}
  <div class="search-info">Filtering by: "{searchQuery}"</div>
{/if}

<DataTable {columns} data={filteredData} {loading} tableId="inventory-main" />

<ReceiveModal bind:open={showReceive} />
<ShipModal bind:open={showShip} />
<TransferModal bind:open={showTransfer} />
<CycleCountModal bind:open={showCount} />

<style>
  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .search-info {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: 0.8rem;
    color: var(--color-primary);
    background: #eff6ff;
    border-radius: var(--radius-sm);
    margin: 0 var(--spacing-md);
  }
</style>
