import { writable, get } from 'svelte/store';
import type { StockRecord, MovementEntry, SafetyStockAlert } from '$lib/types/inventory';
import { StockRecordRepository, MovementLedgerRepository } from '$lib/db';
import { createOptimisticUpdate } from '$lib/services';
import {
  receiveStock as _receiveStock,
  shipStock as _shipStock,
  transferStock as _transferStock,
  cycleCount as _cycleCount,
} from './inventory.service';

const stockRepo = new StockRecordRepository();
const ledgerRepo = new MovementLedgerRepository();

export const inventoryStore = writable<StockRecord[]>([]);
export const ledgerStore = writable<MovementEntry[]>([]);
export const alertStore = writable<SafetyStockAlert[]>([]);

export async function loadInventory(warehouseId?: string): Promise<void> {
  const records = warehouseId
    ? await stockRepo.getByWarehouse(warehouseId)
    : await stockRepo.getAll();
  inventoryStore.set(records);
}

export async function loadLedger(): Promise<void> {
  const entries = await ledgerRepo.getAll();
  ledgerStore.set(entries);
}

export function setAlerts(alerts: SafetyStockAlert[]): void {
  alertStore.set(alerts);
}

export async function optimisticReceive(
  binId: string, skuId: string, warehouseId: string, quantity: number, notes?: string,
) {
  const current = get(inventoryStore);
  const match = current.find(r => r.binId === binId && r.skuId === skuId);
  const optimistic = match
    ? current.map(r => r === match ? { ...r, quantity: r.quantity + quantity } : r)
    : [...current, { id: 'pending', binId, skuId, warehouseId, quantity, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 } as StockRecord];

  return createOptimisticUpdate(inventoryStore, optimistic, async () => {
    await _receiveStock(binId, skuId, warehouseId, quantity, notes);
    inventoryStore.set(await stockRepo.getAll());
  });
}

export async function optimisticShip(
  binId: string, skuId: string, warehouseId: string, quantity: number, orderId?: string, notes?: string,
) {
  const current = get(inventoryStore);
  const optimistic = current.map(r =>
    r.binId === binId && r.skuId === skuId ? { ...r, quantity: r.quantity - quantity } : r,
  );

  return createOptimisticUpdate(inventoryStore, optimistic, async () => {
    await _shipStock(binId, skuId, warehouseId, quantity, orderId, notes);
    inventoryStore.set(await stockRepo.getAll());
  });
}

export async function optimisticTransfer(
  fromBinId: string, toBinId: string, skuId: string, quantity: number,
  fromWarehouseId: string, toWarehouseId: string, notes?: string,
) {
  const current = get(inventoryStore);
  const optimistic = current.map(r => {
    if (r.binId === fromBinId && r.skuId === skuId) return { ...r, quantity: r.quantity - quantity };
    if (r.binId === toBinId && r.skuId === skuId) return { ...r, quantity: r.quantity + quantity };
    return r;
  });

  return createOptimisticUpdate(inventoryStore, optimistic, async () => {
    await _transferStock(fromBinId, toBinId, skuId, quantity, fromWarehouseId, toWarehouseId, notes);
    inventoryStore.set(await stockRepo.getAll());
  });
}

export async function optimisticCycleCount(
  binId: string, skuId: string, warehouseId: string, actualQty: number, notes?: string,
) {
  const current = get(inventoryStore);
  const optimistic = current.map(r =>
    r.binId === binId && r.skuId === skuId ? { ...r, quantity: actualQty } : r,
  );

  return createOptimisticUpdate(inventoryStore, optimistic, async () => {
    await _cycleCount(binId, skuId, warehouseId, actualQty, notes);
    inventoryStore.set(await stockRepo.getAll());
  });
}
