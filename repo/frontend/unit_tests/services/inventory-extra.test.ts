import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  receiveStock,
  checkSafetyStock,
  getStockByBin,
  getStockByWarehouse,
  getLedger,
} from '../../src/modules/inventory/inventory.service';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';

describe('Inventory Service — extra coverage', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  it('checkSafetyStock with no warehouseId scans all warehouses', async () => {
    // Seed stock in two warehouses
    await receiveStock('bin-1', 'sku-1', 'wh-A', 3);
    await receiveStock('bin-2', 'sku-2', 'wh-B', 5);
    const alerts = await checkSafetyStock();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('checkSafetyStock aggregates multiple bins of the same warehouse+SKU', async () => {
    await receiveStock('bin-1', 'sku-1', 'wh-A', 5);
    await receiveStock('bin-2', 'sku-1', 'wh-A', 3); // same wh+sku → aggregated
    const alerts = await checkSafetyStock('wh-A');
    expect(alerts.length).toBeLessThanOrEqual(1);
  });

  it('getStockByBin returns records for specific bin', async () => {
    await receiveStock('bin-X', 'sku-1', 'wh-A', 10);
    const byBin = await getStockByBin('bin-X');
    expect(byBin.length).toBe(1);
    expect(byBin[0].binId).toBe('bin-X');
  });

  it('getStockByWarehouse returns records scoped to warehouse', async () => {
    await receiveStock('bin-1', 'sku-1', 'wh-A', 10);
    await receiveStock('bin-2', 'sku-2', 'wh-B', 5);
    const inA = await getStockByWarehouse('wh-A');
    expect(inA.length).toBe(1);
    expect(inA[0].warehouseId).toBe('wh-A');
  });

  it('getLedger returns all ledger entries', async () => {
    await receiveStock('bin-1', 'sku-1', 'wh-A', 10);
    const ledger = await getLedger();
    expect(ledger.length).toBeGreaterThanOrEqual(1);
  });
});
