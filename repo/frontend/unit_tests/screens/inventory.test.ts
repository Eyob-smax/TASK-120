import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import {
  receiveStock,
  shipStock,
  transferStock,
  cycleCount,
  checkSafetyStock,
} from '../../src/modules/inventory/inventory.service';
import { SafetyStockConfigRepository, StockRecordRepository, MovementLedgerRepository } from '../../src/lib/db';
import { canMutate } from '../../src/lib/security/permissions';
import { UserRole } from '../../src/lib/types/enums';
import { SAFETY_STOCK_DEFAULT } from '../../src/lib/constants';

describe('Inventory Screen Workflows', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  describe('Receive workflow', () => {
    it('creates stock record and shows in store-compatible format', async () => {
      const result = await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      expect(result.stockRecord.quantity).toBe(100);
      expect(result.ledgerEntry).toBeTruthy();
    });
  });

  describe('Ship workflow', () => {
    it('validates insufficient stock with user-friendly message', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 5);
      await expect(shipStock('bin-1', 'sku-1', 'wh-1', 10)).rejects.toThrow('Insufficient');
    });
  });

  describe('Transfer workflow', () => {
    it('updates both source and destination bins', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 50);
      const result = await transferStock('bin-1', 'bin-2', 'sku-1', 20, 'wh-1', 'wh-1');
      expect(result.ledgerEntries).toHaveLength(2);
    });
  });

  describe('Cycle count workflow', () => {
    it('adjusts stock and records ledger entry for difference', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 30);
      const result = await cycleCount('bin-1', 'sku-1', 'wh-1', 25);
      expect(result.stockRecord.quantity).toBe(25);
      expect(result.ledgerEntry).toBeTruthy();
    });
  });

  describe('Safety stock alerts', () => {
    it('triggers alert when below threshold', async () => {
      const repo = new SafetyStockConfigRepository();
      const now = new Date().toISOString();
      await repo.add({
        id: 'ssc-1', warehouseId: 'wh-1', skuId: 'sku-1',
        threshold: SAFETY_STOCK_DEFAULT,
        createdAt: now, updatedAt: now, version: 1,
      });

      await receiveStock('bin-1', 'sku-1', 'wh-1', 10);
      const alerts = await checkSafetyStock('wh-1');
      expect(alerts.some(a => a.skuId === 'sku-1')).toBe(true);
    });
  });

  describe('Role-based action visibility', () => {
    it('Auditor cannot mutate inventory', () => {
      expect(canMutate(UserRole.Auditor, 'inventory.create')).toBe(false);
      expect(canMutate(UserRole.Auditor, 'inventory.update')).toBe(false);
    });

    it('Administrator can mutate inventory', () => {
      expect(canMutate(UserRole.Administrator, 'inventory.create')).toBe(true);
    });

    it('WarehouseManager can mutate inventory', () => {
      expect(canMutate(UserRole.WarehouseManager, 'inventory.create')).toBe(true);
    });
  });
});
