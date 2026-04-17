import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import {
  inventoryStore,
  ledgerStore,
  alertStore,
  loadInventory,
  loadLedger,
  setAlerts,
  optimisticReceive,
  optimisticShip,
  optimisticTransfer,
  optimisticCycleCount,
} from '../../src/modules/inventory/inventory.store';
import { StockRecordRepository, MovementLedgerRepository } from '../../src/lib/db';
import { MovementReason } from '../../src/lib/types/enums';
import type { StockRecord, SafetyStockAlert } from '../../src/lib/types/inventory';

const stockRepo = new StockRecordRepository();
const ledgerRepo = new MovementLedgerRepository();

async function seedStock(binId: string, skuId: string, warehouseId: string, qty: number): Promise<StockRecord> {
  const now = new Date().toISOString();
  const record: StockRecord = {
    id: crypto.randomUUID(),
    binId,
    skuId,
    warehouseId,
    quantity: qty,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await stockRepo.add(record);
  return record;
}

describe('Inventory Store', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
    inventoryStore.set([]);
    ledgerStore.set([]);
    alertStore.set([]);
  });

  afterEach(async () => {
    teardownRealAuth();
    inventoryStore.set([]);
    ledgerStore.set([]);
    alertStore.set([]);
    await resetDb();
  });

  describe('loadInventory', () => {
    it('loads all stock records when no warehouseId', async () => {
      await seedStock('b1', 's1', 'wh-1', 10);
      await seedStock('b2', 's1', 'wh-2', 20);

      await loadInventory();

      const records = get(inventoryStore);
      expect(records).toHaveLength(2);
    });

    it('filters by warehouseId when provided', async () => {
      await seedStock('b1', 's1', 'wh-1', 10);
      await seedStock('b2', 's1', 'wh-2', 20);

      await loadInventory('wh-1');

      const records = get(inventoryStore);
      expect(records).toHaveLength(1);
      expect(records[0].warehouseId).toBe('wh-1');
    });

    it('replaces existing store contents', async () => {
      inventoryStore.set([{ id: 'stale', binId: 'b9', skuId: 's9', warehouseId: 'w9', quantity: 1, createdAt: '', updatedAt: '', version: 1 }]);
      await loadInventory();
      expect(get(inventoryStore)).toHaveLength(0);
    });
  });

  describe('loadLedger', () => {
    it('populates ledgerStore with all ledger entries', async () => {
      const now = new Date().toISOString();
      await ledgerRepo.add({
        id: crypto.randomUUID(),
        timestamp: now,
        operatorId: 'op-1',
        sourceBinId: null,
        destinationBinId: 'b1',
        skuId: 's1',
        quantity: 10,
        reasonCode: MovementReason.Receive,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await loadLedger();
      expect(get(ledgerStore)).toHaveLength(1);
    });

    it('sets empty array when no entries exist', async () => {
      await loadLedger();
      expect(get(ledgerStore)).toEqual([]);
    });
  });

  describe('setAlerts', () => {
    it('replaces alertStore with given alerts', () => {
      const alerts: SafetyStockAlert[] = [
        { warehouseId: 'wh-1', skuId: 's1', currentStock: 5, threshold: 10, triggeredAt: new Date().toISOString() },
      ];
      setAlerts(alerts);
      expect(get(alertStore)).toEqual(alerts);
    });

    it('can clear alerts with empty array', () => {
      setAlerts([{ warehouseId: 'wh-1', skuId: 's1', currentStock: 1, threshold: 5, triggeredAt: '' }]);
      setAlerts([]);
      expect(get(alertStore)).toHaveLength(0);
    });
  });

  describe('optimisticReceive', () => {
    it('adds new record to store when no match', async () => {
      await optimisticReceive('bin-1', 'sku-1', 'wh-1', 15);
      const records = get(inventoryStore);
      expect(records.some(r => r.binId === 'bin-1' && r.skuId === 'sku-1' && r.quantity === 15)).toBe(true);
    });

    it('adds quantity to existing matching record', async () => {
      const existing = await seedStock('bin-1', 'sku-1', 'wh-1', 10);
      inventoryStore.set([existing]);

      await optimisticReceive('bin-1', 'sku-1', 'wh-1', 5);

      const records = get(inventoryStore);
      const match = records.find(r => r.binId === 'bin-1' && r.skuId === 'sku-1');
      expect(match?.quantity).toBe(15);
    });

    it('persists to database after optimistic update', async () => {
      await optimisticReceive('bin-2', 'sku-2', 'wh-1', 7);
      const persisted = await stockRepo.getByBin('bin-2');
      expect(persisted.some(r => r.quantity === 7)).toBe(true);
    });
  });

  describe('optimisticShip', () => {
    it('decreases quantity on matching record optimistically', async () => {
      const existing = await seedStock('bin-1', 'sku-1', 'wh-1', 20);
      inventoryStore.set([existing]);

      await optimisticShip('bin-1', 'sku-1', 'wh-1', 5);

      const records = get(inventoryStore);
      const match = records.find(r => r.binId === 'bin-1' && r.skuId === 'sku-1');
      expect(match?.quantity).toBe(15);
    });

    it('rolls back store on service error', async () => {
      const existing = await seedStock('bin-1', 'sku-1', 'wh-1', 5);
      inventoryStore.set([existing]);

      await expect(optimisticShip('bin-1', 'sku-1', 'wh-1', 100)).rejects.toThrow();

      const records = get(inventoryStore);
      expect(records.find(r => r.binId === 'bin-1')?.quantity).toBe(5);
    });
  });

  describe('optimisticTransfer', () => {
    it('decreases source and increases destination optimistically', async () => {
      const src = await seedStock('bin-a', 'sku-1', 'wh-1', 20);
      const dst = await seedStock('bin-b', 'sku-1', 'wh-1', 2);
      inventoryStore.set([src, dst]);

      await optimisticTransfer('bin-a', 'bin-b', 'sku-1', 5, 'wh-1', 'wh-1');

      const records = get(inventoryStore);
      expect(records.find(r => r.binId === 'bin-a')?.quantity).toBe(15);
      expect(records.find(r => r.binId === 'bin-b')?.quantity).toBe(7);
    });

    it('rolls back on insufficient source stock', async () => {
      const src = await seedStock('bin-a', 'sku-1', 'wh-1', 1);
      inventoryStore.set([src]);

      await expect(
        optimisticTransfer('bin-a', 'bin-b', 'sku-1', 10, 'wh-1', 'wh-1'),
      ).rejects.toThrow();

      expect(get(inventoryStore).find(r => r.binId === 'bin-a')?.quantity).toBe(1);
    });
  });

  describe('optimisticCycleCount', () => {
    it('sets exact quantity on matching record', async () => {
      const existing = await seedStock('bin-1', 'sku-1', 'wh-1', 30);
      inventoryStore.set([existing]);

      await optimisticCycleCount('bin-1', 'sku-1', 'wh-1', 25);

      const records = get(inventoryStore);
      expect(records.find(r => r.binId === 'bin-1')?.quantity).toBe(25);
    });
  });
});
