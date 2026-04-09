import { Repository } from '../repository';
import { STORE_NAMES } from '../schema';
import type { Warehouse, Bin, StockRecord, MovementEntry, SKU, SafetyStockConfig } from '$lib/types/inventory';

export class WarehouseRepository extends Repository<Warehouse> {
  constructor() {
    super(STORE_NAMES.WAREHOUSES);
  }

  async getSubWarehouses(parentId: string): Promise<Warehouse[]> {
    return this.getByIndex('parentId', parentId);
  }

  async getByCode(code: string): Promise<Warehouse | undefined> {
    return this.getOneByIndex('code', code);
  }
}

export class BinRepository extends Repository<Bin> {
  constructor() {
    super(STORE_NAMES.BINS);
  }

  async getByWarehouse(warehouseId: string): Promise<Bin[]> {
    return this.getByIndex('warehouseId', warehouseId);
  }

  async getByZone(zone: string): Promise<Bin[]> {
    return this.getByIndex('zone', zone);
  }
}

export class SKURepository extends Repository<SKU> {
  constructor() {
    super(STORE_NAMES.SKUS);
  }

  async getByCode(code: string): Promise<SKU | undefined> {
    return this.getOneByIndex('code', code);
  }

  async getByCategory(category: string): Promise<SKU[]> {
    return this.getByIndex('category', category);
  }
}

export class StockRecordRepository extends Repository<StockRecord> {
  constructor() {
    super(STORE_NAMES.STOCK_RECORDS);
  }

  async getByBin(binId: string): Promise<StockRecord[]> {
    return this.getByIndex('binId', binId);
  }

  async getBySku(skuId: string): Promise<StockRecord[]> {
    return this.getByIndex('skuId', skuId);
  }

  async getByWarehouse(warehouseId: string): Promise<StockRecord[]> {
    return this.getByIndex('warehouseId', warehouseId);
  }

  async getByWarehouseAndSku(warehouseId: string, skuId: string): Promise<StockRecord[]> {
    return this.getByIndex('warehouseId_skuId', [warehouseId, skuId]);
  }
}

export class MovementLedgerRepository extends Repository<MovementEntry> {
  constructor() {
    super(STORE_NAMES.MOVEMENT_LEDGER);
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Movement ledger is append-only. Deletes are not permitted.');
  }

  async clear(): Promise<void> {
    throw new Error('Movement ledger is append-only. Clearing is not permitted.');
  }

  async getByDateRange(start: string, end: string): Promise<MovementEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  async getByOperator(operatorId: string): Promise<MovementEntry[]> {
    return this.getByIndex('operatorId', operatorId);
  }

  async getBySku(skuId: string): Promise<MovementEntry[]> {
    return this.getByIndex('skuId', skuId);
  }

  async getByOrder(orderId: string): Promise<MovementEntry[]> {
    return this.getByIndex('orderId', orderId);
  }
}

export class SafetyStockConfigRepository extends Repository<SafetyStockConfig> {
  constructor() {
    super(STORE_NAMES.SAFETY_STOCK_CONFIGS);
  }

  async getByWarehouse(warehouseId: string): Promise<SafetyStockConfig[]> {
    return this.getByIndex('warehouseId', warehouseId);
  }

  async getByWarehouseAndSku(warehouseId: string, skuId: string): Promise<SafetyStockConfig[]> {
    return this.getByIndex('warehouseId_skuId', [warehouseId, skuId]);
  }
}
