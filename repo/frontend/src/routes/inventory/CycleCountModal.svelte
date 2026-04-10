<script lang="ts">
  import { getContext } from 'svelte';
  import Modal from '$components/Modal.svelte';
  import { optimisticCycleCount } from '$modules/inventory';

  export let open = false;

  const toast: any = getContext('toast');

  let binId = '';
  let skuId = '';
  let warehouseId = '';
  let actualQty = 0;
  let notes = '';
  let submitting = false;
  let error = '';

  async function handleConfirm() {
    if (submitting) return;
    error = '';
    submitting = true;
    try {
      await optimisticCycleCount(binId, skuId, warehouseId, actualQty, notes || undefined);
      toast?.addToast(`Cycle count recorded`, 'success');
      resetForm();
      open = false;
    } catch (e: any) {
      error = e.message || 'Cycle count failed';
    } finally {
      submitting = false;
    }
  }

  function resetForm() { binId = ''; skuId = ''; warehouseId = ''; actualQty = 0; notes = ''; error = ''; }
</script>

<Modal {open} title="Cycle Count" confirmLabel={submitting ? 'Saving...' : 'Record Count'} confirmDisabled={submitting} on:close={() => { open = false; }} on:confirm={handleConfirm}>
  {#if error}<div class="form-error">{error}</div>{/if}
  <label>Warehouse ID <input bind:value={warehouseId} required /></label>
  <label>Bin ID <input bind:value={binId} required /></label>
  <label>SKU ID <input bind:value={skuId} required /></label>
  <label>Actual Quantity <input type="number" bind:value={actualQty} min="0" required /></label>
  <label>Notes <textarea bind:value={notes} rows="2"></textarea></label>
</Modal>

<style>
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; font-weight: 500; }
  input, textarea { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
