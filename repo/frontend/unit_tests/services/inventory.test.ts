import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  receiveStock,
  shipStock,
  transferStock,
  cycleCount,
  checkSafetyStock,
} from '../../src/modules/inventory/inventory.service';
import { MovementLedgerRepository, SafetyStockConfigRepository, StockRecordRepository } from '../../src/lib/db';
import { MovementReason } from '../../src/lib/types/enums';
import { SAFETY_STOCK_DEFAULT } from '../../src/lib/constants';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';

const ledgerRepo = new MovementLedgerRepository();
const stockRepo = new StockRecordRepository();
const safetyStockRepo = new SafetyStockConfigRepository();

describe('Inventory Service', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  describe('receiveStock', () => {
    it('creates stock record and ledger entry', async () => {
      const result = await receiveStock('bin-1', 'sku-1', 'wh-1', 50);

      expect(result.stockRecord.quantity).toBe(50);
      expect(result.stockRecord.binId).toBe('bin-1');
      expect(result.stockRecord.skuId).toBe('sku-1');

      expect(result.ledgerEntry.reasonCode).toBe(MovementReason.Receive);
      expect(result.ledgerEntry.quantity).toBe(50);
      expect(result.ledgerEntry.destinationBinId).toBe('bin-1');
      expect(result.ledgerEntry.sourceBinId).toBeNull();
    });

    it('adds to existing stock record', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 30);
      const result = await receiveStock('bin-1', 'sku-1', 'wh-1', 20);
      expect(result.stockRecord.quantity).toBe(50);
    });
  });

  describe('shipStock', () => {
    it('deducts stock and creates ledger entry', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      const result = await shipStock('bin-1', 'sku-1', 'wh-1', 30);

      expect(result.stockRecord.quantity).toBe(70);
      expect(result.ledgerEntry.reasonCode).toBe(MovementReason.Ship);
      expect(result.ledgerEntry.sourceBinId).toBe('bin-1');
    });

    it('rejects insufficient stock', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 10);
      await expect(shipStock('bin-1', 'sku-1', 'wh-1', 20)).rejects.toThrow('Insufficient');
    });
  });

  describe('transferStock', () => {
    it('creates two ledger entries (TransferOut + TransferIn)', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 50);
      const result = await transferStock('bin-1', 'bin-2', 'sku-1', 20, 'wh-1', 'wh-1');

      expect(result.ledgerEntries).toHaveLength(2);
      expect(result.ledgerEntries[0].reasonCode).toBe(MovementReason.TransferOut);
      expect(result.ledgerEntries[1].reasonCode).toBe(MovementReason.TransferIn);
    });

    it('deducts from source and adds to destination', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 50);
      await transferStock('bin-1', 'bin-2', 'sku-1', 20, 'wh-1', 'wh-1');

      const source = await stockRepo.getByBin('bin-1');
      const dest = await stockRepo.getByBin('bin-2');
      expect(source.find(r => r.skuId === 'sku-1')?.quantity).toBe(30);
      expect(dest.find(r => r.skuId === 'sku-1')?.quantity).toBe(20);
    });

    it('rejects insufficient stock at source', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 5);
      await expect(
        transferStock('bin-1', 'bin-2', 'sku-1', 10, 'wh-1', 'wh-1'),
      ).rejects.toThrow('Insufficient');
    });
  });

  describe('cycleCount', () => {
    it('adjusts stock upward', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 30);
      const result = await cycleCount('bin-1', 'sku-1', 'wh-1', 40);

      expect(result.stockRecord.quantity).toBe(40);
      expect(result.ledgerEntry).not.toBeNull();
      expect(result.ledgerEntry!.quantity).toBe(10);
      expect(result.ledgerEntry!.reasonCode).toBe(MovementReason.CycleCountAdjust);
    });

    it('adjusts stock downward', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 30);
      const result = await cycleCount('bin-1', 'sku-1', 'wh-1', 20);

      expect(result.stockRecord.quantity).toBe(20);
      expect(result.ledgerEntry!.quantity).toBe(10);
    });

    it('creates no ledger entry when count matches', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 30);
      const result = await cycleCount('bin-1', 'sku-1', 'wh-1', 30);
      expect(result.ledgerEntry).toBeNull();
    });
  });

  describe('checkSafetyStock', () => {
    it('generates alert when stock below threshold', async () => {
      const now = new Date().toISOString();
      await safetyStockRepo.add({
        id: 'ssc-1', warehouseId: 'wh-1', skuId: 'sku-1',
        threshold: SAFETY_STOCK_DEFAULT,
        createdAt: now, updatedAt: now, version: 1,
      });

      await receiveStock('bin-1', 'sku-1', 'wh-1', 10);
      const alerts = await checkSafetyStock('wh-1');

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].currentStock).toBe(10);
      expect(alerts[0].threshold).toBe(SAFETY_STOCK_DEFAULT);
    });

    it('no alert when stock meets threshold', async () => {
      const now = new Date().toISOString();
      await safetyStockRepo.add({
        id: 'ssc-2', warehouseId: 'wh-1', skuId: 'sku-2',
        threshold: 10,
        createdAt: now, updatedAt: now, version: 1,
      });

      await receiveStock('bin-1', 'sku-2', 'wh-1', 15);
      const alerts = await checkSafetyStock('wh-1');
      const sku2Alert = alerts.find(a => a.skuId === 'sku-2');
      expect(sku2Alert).toBeUndefined();
    });
  });

  describe('Ledger immutability', () => {
    it('ledger entries cannot be deleted', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 10);
      const entries = await ledgerRepo.getAll();
      expect(entries.length).toBeGreaterThan(0);

      await expect(ledgerRepo.delete(entries[0].id)).rejects.toThrow('append-only');
    });

    it('ledger cannot be cleared', async () => {
      await expect(ledgerRepo.clear()).rejects.toThrow('append-only');
    });
  });
});
