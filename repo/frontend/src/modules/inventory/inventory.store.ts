import { writable } from 'svelte/store';
import type { StockRecord, MovementEntry, SafetyStockAlert } from '$lib/types/inventory';
import { StockRecordRepository, MovementLedgerRepository } from '$lib/db';

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
