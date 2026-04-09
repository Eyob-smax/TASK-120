<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { shipStock, loadInventory } from '$modules/inventory';

  export let open = false;

  const toast: any = getContext('toast');

  let binId = '';
  let skuId = '';
  let warehouseId = '';
  let quantity = 0;
  let orderId = '';
  let notes = '';
  let submitting = false;
  let error = '';

  async function handleConfirm() {
    if (submitting) return;
    error = '';
    submitting = true;
    try {
      await shipStock(binId, skuId, warehouseId, quantity, orderId || undefined, notes || undefined);
      await loadInventory();
      toast?.addToast(`Shipped ${quantity} units of ${skuId}`, 'success');
      resetForm();
      open = false;
    } catch (e: any) {
      error = e.message || 'Failed to ship stock';
    } finally {
      submitting = false;
    }
  }

  function resetForm() { binId = ''; skuId = ''; warehouseId = ''; quantity = 0; orderId = ''; notes = ''; error = ''; }
</script>

<Modal {open} title="Ship Stock" confirmLabel={submitting ? 'Saving...' : 'Ship'} confirmDisabled={submitting} on:close={() => { open = false; }} on:confirm={handleConfirm}>
  {#if error}<div class="form-error">{error}</div>{/if}
  <label>Warehouse ID <input bind:value={warehouseId} required /></label>
  <label>Bin ID <input bind:value={binId} required /></label>
  <label>SKU ID <input bind:value={skuId} required /></label>
  <label>Quantity <input type="number" bind:value={quantity} min="1" required /></label>
  <label>Order ID (optional) <input bind:value={orderId} /></label>
  <label>Notes <textarea bind:value={notes} rows="2"></textarea></label>
</Modal>

<style>
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; font-weight: 500; }
  input, textarea { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
