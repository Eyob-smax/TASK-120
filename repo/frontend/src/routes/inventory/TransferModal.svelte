<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { transferStock, loadInventory } from '$modules/inventory';

  export let open = false;

  const toast: any = getContext('toast');

  let fromBinId = '';
  let toBinId = '';
  let skuId = '';
  let quantity = 0;
  let fromWarehouseId = '';
  let toWarehouseId = '';
  let notes = '';
  let submitting = false;
  let error = '';

  async function handleConfirm() {
    if (submitting) return;
    error = '';
    submitting = true;
    try {
      await transferStock(fromBinId, toBinId, skuId, quantity, fromWarehouseId, toWarehouseId, notes || undefined);
      await loadInventory();
      toast?.addToast(`Transferred ${quantity} units of ${skuId}`, 'success');
      resetForm();
      open = false;
    } catch (e: any) {
      error = e.message || 'Transfer failed';
    } finally {
      submitting = false;
    }
  }

  function resetForm() { fromBinId = ''; toBinId = ''; skuId = ''; quantity = 0; fromWarehouseId = ''; toWarehouseId = ''; notes = ''; error = ''; }
</script>

<Modal {open} title="Transfer Stock" confirmLabel={submitting ? 'Saving...' : 'Transfer'} confirmDisabled={submitting} on:close={() => { open = false; }} on:confirm={handleConfirm}>
  {#if error}<div class="form-error">{error}</div>{/if}
  <label>From Warehouse <input bind:value={fromWarehouseId} required /></label>
  <label>From Bin <input bind:value={fromBinId} required /></label>
  <label>To Warehouse <input bind:value={toWarehouseId} required /></label>
  <label>To Bin <input bind:value={toBinId} required /></label>
  <label>SKU ID <input bind:value={skuId} required /></label>
  <label>Quantity <input type="number" bind:value={quantity} min="1" required /></label>
  <label>Notes <textarea bind:value={notes} rows="2"></textarea></label>
</Modal>

<style>
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; font-weight: 500; }
  input, textarea { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
