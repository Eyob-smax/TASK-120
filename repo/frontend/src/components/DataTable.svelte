<script lang="ts">
  import LoadingSpinner from './LoadingSpinner.svelte';
  import EmptyState from './EmptyState.svelte';
  import MaskedField from './MaskedField.svelte';

  interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    maskField?: string;
    maskType?: 'email' | 'name' | 'default';
  }

  export let columns: Column[] = [];
  export let data: Record<string, unknown>[] = [];
  export let loading = false;
  export let tableId = '';
  export let pageSize = 25;
  export let showActions = false;
  export let onRowAction: ((row: Record<string, unknown>, action: string) => void) | undefined = undefined;
  export let rowActions: Array<{ label: string; action: string; variant?: string }> = [];

  let sortKey = '';
  let sortAsc = true;
  let currentPage = 0;

  $: sortedData = sortKey
    ? [...data].sort((a, b) => {
        const av = String(a[sortKey] ?? '');
        const bv = String(b[sortKey] ?? '');
        const cmp = av.localeCompare(bv);
        return sortAsc ? cmp : -cmp;
      })
    : data;

  $: totalPages = Math.ceil(sortedData.length / pageSize);
  $: pagedData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = true;
    }
    currentPage = 0;
  }
</script>

<div class="data-table-container">
  <slot name="filters" />

  {#if loading}
    <LoadingSpinner message="Loading data..." />
  {:else if data.length === 0}
    <EmptyState message="No records found" />
  {:else}
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col}
            <th>
              {#if col.sortable}
                <button class="sort-btn" on:click={() => toggleSort(col.key)}>
                  {col.label}
                  {#if sortKey === col.key}
                    <span>{sortAsc ? '↑' : '↓'}</span>
                  {/if}
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
          {#if showActions}<th>Actions</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each pagedData as row}
          <tr>
            {#each columns as col}
              <td>
                {#if col.maskField}
                  <MaskedField
                    fieldName={col.maskField}
                    value={String(row[col.key] ?? '')}
                    maskType={col.maskType ?? 'default'}
                  />
                {:else}
                  {row[col.key] ?? ''}
                {/if}
              </td>
            {/each}
            {#if showActions}
              <td class="actions-cell">
                {#each rowActions as ra}
                  <button
                    class="row-action-btn {ra.variant ?? ''}"
                    on:click={() => onRowAction?.(row, ra.action)}
                  >{ra.label}</button>
                {/each}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>

    {#if totalPages > 1}
      <div class="pagination">
        <button disabled={currentPage === 0} on:click={() => currentPage--}>Prev</button>
        <span>{currentPage + 1} / {totalPages}</span>
        <button disabled={currentPage >= totalPages - 1} on:click={() => currentPage++}>Next</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .data-table-container { padding: var(--spacing-md); }
  .data-table { width: 100%; border-collapse: collapse; }
  th, td {
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.875rem;
  }
  th { font-weight: 600; background: #f9fafb; }
  .sort-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  tr:hover td { background: #f9fafb; }
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
  }
  .pagination button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
  }
  .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
  .actions-cell { display: flex; gap: 4px; }
  .row-action-btn { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.75rem; white-space: nowrap; }
  .row-action-btn:hover { background: #f3f4f6; }
  .row-action-btn.danger { color: var(--color-danger); border-color: var(--color-danger); }
</style>
