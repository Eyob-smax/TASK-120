<script lang="ts">
  import { getContext } from 'svelte';
  import Drawer from '$components/Drawer.svelte';
  import { optimisticCreateOrder } from '$modules/orders';
  import type { OrderLine } from '$lib/types/orders';

  export let open = false;

  const toast: any = getContext('toast');

  let lines: Array<{ skuId: string; binId: string; quantity: number }> = [{ skuId: '', binId: '', quantity: 1 }];
  let notes = '';
  let submitting = false;
  let error = '';

  function addLine() { lines = [...lines, { skuId: '', binId: '', quantity: 1 }]; }
  function removeLine(i: number) { lines = lines.filter((_, idx) => idx !== i); }

  async function handleSubmit() {
    error = '';
    submitting = true;
    try {
      const orderLines: OrderLine[] = lines.map((l, i) => ({
        id: `line-${i}`,
        orderId: '',
        skuId: l.skuId,
        binId: l.binId,
        quantity: l.quantity,
      }));
      await optimisticCreateOrder({ lines: orderLines, notes: notes || undefined });
      toast?.addToast('Order created with stock reservations', 'success');
      resetForm();
      open = false;
    } catch (e: any) {
      error = e.message || 'Failed to create order';
    } finally {
      submitting = false;
    }
  }

  function resetForm() { lines = [{ skuId: '', binId: '', quantity: 1 }]; notes = ''; error = ''; }
</script>

<Drawer {open} title="Create Order" on:close={() => { open = false; }}>
  {#if error}<div class="form-error">{error}</div>{/if}

  <div class="lines-section">
    <h4>Order Lines</h4>
    {#each lines as line, i}
      <div class="line-row">
        <input placeholder="SKU" bind:value={line.skuId} required />
        <input placeholder="Bin" bind:value={line.binId} required />
        <input type="number" placeholder="Qty" bind:value={line.quantity} min="1" required />
        {#if lines.length > 1}
          <button class="remove-btn" on:click={() => removeLine(i)}>x</button>
        {/if}
      </div>
    {/each}
    <button class="add-btn" on:click={addLine}>+ Add Line</button>
  </div>

  <label>Notes <textarea bind:value={notes} rows="2"></textarea></label>

  <button class="submit-btn" on:click={handleSubmit} disabled={submitting}>
    {submitting ? 'Creating...' : 'Create Order'}
  </button>
</Drawer>

<style>
  .lines-section { margin-bottom: var(--spacing-md); }
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-sm); }
  .line-row { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-xs); }
  .line-row input { flex: 1; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.85rem; }
  .remove-btn { background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: 600; }
  .add-btn { background: none; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); padding: var(--spacing-xs) var(--spacing-sm); cursor: pointer; font-size: 0.8rem; width: 100%; }
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.875rem; font-weight: 500; }
  textarea { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .submit-btn { width: 100%; padding: var(--spacing-sm); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; margin-top: var(--spacing-md); }
  .submit-btn:disabled { opacity: 0.6; }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
