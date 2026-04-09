<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import ExportButton from '$components/ExportButton.svelte';
  import FilterChip from '$components/FilterChip.svelte';
  import { ledgerStore, loadLedger } from '$modules/inventory';
  import { MovementReason } from '$lib/types/enums';

  let loading = true;
  let reasonFilter = '';

  onMount(async () => {
    await loadLedger();
    loading = false;
  });

  $: filteredData = reasonFilter
    ? $ledgerStore.filter(e => e.reasonCode === reasonFilter)
    : $ledgerStore;

  const columns = [
    { key: 'timestamp', label: 'Timestamp', sortable: true },
    { key: 'operatorId', label: 'Operator', sortable: true },
    { key: 'reasonCode', label: 'Reason', sortable: true },
    { key: 'skuId', label: 'SKU', sortable: true },
    { key: 'quantity', label: 'Qty', sortable: true },
    { key: 'sourceBinId', label: 'From Bin', sortable: false },
    { key: 'destinationBinId', label: 'To Bin', sortable: false },
  ];

  const csvColumns = ['id', 'timestamp', 'operatorId', 'sourceBinId', 'destinationBinId', 'skuId', 'quantity', 'reasonCode', 'orderId', 'notes'];
</script>

<PageHeader title="Movement Ledger">
  <ExportButton data={filteredData} columns={csvColumns} filename="ledger-export.csv" />
  <a href="#/inventory">Back to Inventory</a>
</PageHeader>

<div class="filters">
  <select bind:value={reasonFilter} class="filter-select">
    <option value="">All Reasons</option>
    {#each Object.values(MovementReason) as reason}
      <option value={reason}>{reason}</option>
    {/each}
  </select>
  {#if reasonFilter}
    <FilterChip label="Reason" value={reasonFilter} on:remove={() => reasonFilter = ''} />
  {/if}
</div>

<DataTable {columns} data={filteredData} {loading} tableId="ledger-main" />

<style>
  .filters { padding: 0 var(--spacing-md); display: flex; gap: var(--spacing-xs); flex-wrap: wrap; align-items: center; }
  .filter-select { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.8rem; background: white; }
</style>
