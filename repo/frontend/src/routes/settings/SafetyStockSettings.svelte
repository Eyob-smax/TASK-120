<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { SafetyStockConfigRepository } from '$lib/db';
  import { SAFETY_STOCK_DEFAULT } from '$lib/constants';
  import type { SafetyStockConfig } from '$lib/types/inventory';

  const toast: any = getContext('toast');
  const repo = new SafetyStockConfigRepository();

  let configs: SafetyStockConfig[] = [];
  let warehouseId = '';
  let skuId = '';
  let threshold = SAFETY_STOCK_DEFAULT;
  let error = '';

  onMount(async () => {
    configs = await repo.getAll();
  });

  async function handleAdd() {
    error = '';
    try {
      const now = new Date().toISOString();
      await repo.add({
        id: crypto.randomUUID(),
        warehouseId,
        skuId,
        threshold,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      configs = await repo.getAll();
      toast?.addToast('Safety stock threshold saved', 'success');
      warehouseId = ''; skuId = ''; threshold = SAFETY_STOCK_DEFAULT;
    } catch (e: any) {
      error = e.message || 'Failed to save';
    }
  }
</script>

<div class="safety-stock-settings">
  <h4>Safety Stock Thresholds</h4>
  <p>Default: {SAFETY_STOCK_DEFAULT} units per SKU per warehouse</p>

  <div class="config-list">
    {#each configs as config}
      <div class="config-row">
        <span>WH: {config.warehouseId}</span>
        <span>SKU: {config.skuId}</span>
        <span class="threshold">{config.threshold} units</span>
      </div>
    {/each}
  </div>

  <div class="add-form">
    {#if error}<div class="form-error">{error}</div>{/if}
    <label>Warehouse <input bind:value={warehouseId} /></label>
    <label>SKU <input bind:value={skuId} /></label>
    <label>Threshold <input type="number" bind:value={threshold} min="0" /></label>
    <button on:click={handleAdd}>Set Threshold</button>
  </div>
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  p { font-size: 0.8rem; color: var(--color-muted); margin-bottom: var(--spacing-sm); }
  .config-row { display: flex; gap: var(--spacing-md); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; }
  .threshold { font-weight: 600; }
  .add-form { margin-top: var(--spacing-md); }
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
  input { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  button { padding: var(--spacing-xs) var(--spacing-md); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
