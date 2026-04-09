import type { BaseEntity } from './common';
import type { MovementReason } from './enums';

export interface Warehouse extends BaseEntity {
  name: string;
  code: string;
  parentId?: string;
  address?: string;
}

export function isSubWarehouse(w: Warehouse): boolean {
  return w.parentId !== undefined && w.parentId !== null;
}

export interface Bin extends BaseEntity {
  warehouseId: string;
  code: string;
  zone: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  isActive: boolean;
}

export interface SKU extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
}

export interface StockRecord extends BaseEntity {
  binId: string;
  skuId: string;
  warehouseId: string;
  quantity: number;
  lastCountedAt?: string;
}

export interface MovementEntry extends BaseEntity {
  timestamp: string;
  operatorId: string;
  sourceBinId: string | null;
  destinationBinId: string | null;
  skuId: string;
  quantity: number;
  reasonCode: MovementReason;
  orderId?: string;
  notes?: string;
}

export interface SafetyStockConfig extends BaseEntity {
  warehouseId: string;
  skuId: string;
  threshold: number;
}

export interface SafetyStockAlert {
  warehouseId: string;
  skuId: string;
  currentStock: number;
  threshold: number;
  triggeredAt: string;
}
