<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { planWave, loadWaves, orderStore } from '$modules/orders';

  export let open = false;

  const toast: any = getContext('toast');

  let selectedOrderIds: string[] = [];
  let maxLines = 25;
  let submitting = false;
  let error = '';

  $: orders = $orderStore;

  function toggleOrder(id: string) {
    if (selectedOrderIds.includes(id)) {
      selectedOrderIds = selectedOrderIds.filter(o => o !== id);
    } else {
      selectedOrderIds = [...selectedOrderIds, id];
    }
  }

  async function handleConfirm() {
    if (submitting) return;
    error = '';
    submitting = true;
    try {
      await planWave(selectedOrderIds, { maxLinesPerWave: maxLines });
      await loadWaves();
      toast?.addToast('Wave planned successfully', 'success');
      selectedOrderIds = [];
      open = false;
    } catch (e: any) {
      error = e.message || 'Wave planning failed';
    } finally {
      submitting = false;
    }
  }
</script>

<Modal {open} title="Plan Wave" confirmLabel={submitting ? 'Planning...' : 'Plan Wave'} confirmDisabled={submitting} on:close={() => { open = false; }} on:confirm={handleConfirm}>
  {#if error}<div class="form-error">{error}</div>{/if}

  <label>Max Lines per Wave <input type="number" bind:value={maxLines} min="1" /></label>

  <div class="order-list">
    <h4>Select Orders</h4>
    {#each orders as order}
      <label class="order-item">
        <input type="checkbox" checked={selectedOrderIds.includes(order.id)} on:change={() => toggleOrder(order.id)} />
        {order.orderNumber} ({order.lines.length} lines) - {order.status}
      </label>
    {/each}
    {#if orders.length === 0}
      <p class="empty">No orders available</p>
    {/if}
  </div>
</Modal>

<style>
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; }
  input[type="number"] { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .order-list { margin-top: var(--spacing-md); }
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-sm); }
  .order-item { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; font-weight: 400; cursor: pointer; }
  .empty { color: var(--color-muted); font-size: 0.85rem; }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
