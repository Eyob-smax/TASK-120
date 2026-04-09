import {
  StockRecordRepository,
  MovementLedgerRepository,
  SafetyStockConfigRepository,
  BinRepository,
} from '$lib/db';
import { validateStockMovement, validateTransfer, validateCycleCount } from '$lib/validators';
import { ValidationServiceError } from '$lib/services/errors';
import { getCurrentSession } from '$lib/security/auth.service';
import { createLogger } from '$lib/logging';
import { SAFETY_STOCK_DEFAULT } from '$lib/constants';
import { MovementReason, NotificationType } from '$lib/types/enums';
import { dispatchNotification } from '$modules/notifications/notification.service';
import type { StockRecord, MovementEntry, SafetyStockAlert } from '$lib/types/inventory';

const stockRepo = new StockRecordRepository();
const ledgerRepo = new MovementLedgerRepository();
const safetyStockRepo = new SafetyStockConfigRepository();
const binRepo = new BinRepository();
const logger = createLogger('inventory');

function requireOperatorId(): string {
  const session = getCurrentSession();
  if (!session) throw new ValidationServiceError('Not authenticated', [
    { field: 'session', message: 'User must be logged in', code: 'unauthenticated' },
  ]);
  return session.userId;
}

async function getOrCreateStockRecord(
  binId: string,
  skuId: string,
  warehouseId: string,
): Promise<StockRecord> {
  const existing = await stockRepo.getByIndex('binId', binId);
  const match = existing.find(r => r.skuId === skuId);
  if (match) return match;

  const now = new Date().toISOString();
  const record: StockRecord = {
    id: crypto.randomUUID(),
    binId,
    skuId,
    warehouseId,
    quantity: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await stockRepo.add(record);
  return record;
}

async function writeLedgerEntry(
  entry: Omit<MovementEntry, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
): Promise<MovementEntry> {
  const now = new Date().toISOString();
  const ledgerEntry: MovementEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await ledgerRepo.add(ledgerEntry);
  return ledgerEntry;
}

export async function receiveStock(
  binId: string,
  skuId: string,
  warehouseId: string,
  quantity: number,
  notes?: string,
): Promise<{ stockRecord: StockRecord; ledgerEntry: MovementEntry; alerts: SafetyStockAlert[] }> {
  const operatorId = requireOperatorId();

  const validation = validateStockMovement({
    skuId, operatorId, quantity,
    reasonCode: MovementReason.Receive,
    sourceBinId: null,
    destinationBinId: binId,
  });
  if (!validation.valid) throw new ValidationServiceError('Invalid receive', validation.errors);

  const record = await getOrCreateStockRecord(binId, skuId, warehouseId);
  const updated = await stockRepo.put({
    ...record,
    quantity: record.quantity + quantity,
    updatedAt: new Date().toISOString(),
  });

  const ledgerEntry = await writeLedgerEntry({
    timestamp: new Date().toISOString(),
    operatorId,
    sourceBinId: null,
    destinationBinId: binId,
    skuId,
    quantity,
    reasonCode: MovementReason.Receive,
    notes,
  });

  logger.info('Stock received', { binId, skuId, quantity });
  const alerts = await checkSafetyStock(warehouseId);
  return { stockRecord: updated, ledgerEntry, alerts };
}

export async function shipStock(
  binId: string,
  skuId: string,
  warehouseId: string,
  quantity: number,
  orderId?: string,
  notes?: string,
): Promise<{ stockRecord: StockRecord; ledgerEntry: MovementEntry; alerts: SafetyStockAlert[] }> {
  const operatorId = requireOperatorId();

  const validation = validateStockMovement({
    skuId, operatorId, quantity,
    reasonCode: MovementReason.Ship,
    sourceBinId: binId,
    destinationBinId: null,
  });
  if (!validation.valid) throw new ValidationServiceError('Invalid shipment', validation.errors);

  const record = await getOrCreateStockRecord(binId, skuId, warehouseId);
  if (record.quantity < quantity) {
    throw new ValidationServiceError('Insufficient stock', [
      { field: 'quantity', message: `Available: ${record.quantity}, requested: ${quantity}`, code: 'insufficient_stock' },
    ]);
  }

  const updated = await stockRepo.put({
    ...record,
    quantity: record.quantity - quantity,
    updatedAt: new Date().toISOString(),
  });

  const ledgerEntry = await writeLedgerEntry({
    timestamp: new Date().toISOString(),
    operatorId,
    sourceBinId: binId,
    destinationBinId: null,
    skuId,
    quantity,
    reasonCode: MovementReason.Ship,
    orderId,
    notes,
  });

  logger.info('Stock shipped', { binId, skuId, quantity, orderId });
  const alerts = await checkSafetyStock(warehouseId);
  return { stockRecord: updated, ledgerEntry, alerts };
}

export async function transferStock(
  fromBinId: string,
  toBinId: string,
  skuId: string,
  quantity: number,
  fromWarehouseId: string,
  toWarehouseId: string,
  notes?: string,
): Promise<{ ledgerEntries: MovementEntry[]; alerts: SafetyStockAlert[] }> {
  const operatorId = requireOperatorId();

  const validation = validateTransfer(fromBinId, toBinId, skuId, quantity);
  if (!validation.valid) throw new ValidationServiceError('Invalid transfer', validation.errors);

  const sourceRecord = await getOrCreateStockRecord(fromBinId, skuId, fromWarehouseId);
  if (sourceRecord.quantity < quantity) {
    throw new ValidationServiceError('Insufficient stock for transfer', [
      { field: 'quantity', message: `Available: ${sourceRecord.quantity}, requested: ${quantity}`, code: 'insufficient_stock' },
    ]);
  }

  await stockRepo.put({
    ...sourceRecord,
    quantity: sourceRecord.quantity - quantity,
    updatedAt: new Date().toISOString(),
  });

  const destRecord = await getOrCreateStockRecord(toBinId, skuId, toWarehouseId);
  await stockRepo.put({
    ...destRecord,
    quantity: destRecord.quantity + quantity,
    updatedAt: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  const outEntry = await writeLedgerEntry({
    timestamp: now, operatorId, sourceBinId: fromBinId, destinationBinId: null,
    skuId, quantity, reasonCode: MovementReason.TransferOut, notes,
  });
  const inEntry = await writeLedgerEntry({
    timestamp: now, operatorId, sourceBinId: null, destinationBinId: toBinId,
    skuId, quantity, reasonCode: MovementReason.TransferIn, notes,
  });

  logger.info('Stock transferred', { fromBinId, toBinId, skuId, quantity });
  const alerts = [
    ...await checkSafetyStock(fromWarehouseId),
    ...(fromWarehouseId !== toWarehouseId ? await checkSafetyStock(toWarehouseId) : []),
  ];
  return { ledgerEntries: [outEntry, inEntry], alerts };
}

export async function cycleCount(
  binId: string,
  skuId: string,
  warehouseId: string,
  actualQty: number,
  notes?: string,
): Promise<{ stockRecord: StockRecord; ledgerEntry: MovementEntry | null; alerts: SafetyStockAlert[] }> {
  const operatorId = requireOperatorId();

  const validation = validateCycleCount(binId, skuId, actualQty);
  if (!validation.valid) throw new ValidationServiceError('Invalid cycle count', validation.errors);

  const record = await getOrCreateStockRecord(binId, skuId, warehouseId);
  const diff = actualQty - record.quantity;

  const updated = await stockRepo.put({
    ...record,
    quantity: actualQty,
    lastCountedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  let ledgerEntry: MovementEntry | null = null;
  if (diff !== 0) {
    ledgerEntry = await writeLedgerEntry({
      timestamp: new Date().toISOString(),
      operatorId,
      sourceBinId: diff < 0 ? binId : null,
      destinationBinId: diff > 0 ? binId : null,
      skuId,
      quantity: Math.abs(diff),
      reasonCode: MovementReason.CycleCountAdjust,
      notes: notes ?? `Cycle count adjustment: ${record.quantity} → ${actualQty}`,
    });
  }

  logger.info('Cycle count', { binId, skuId, previousQty: record.quantity, actualQty });
  const alerts = await checkSafetyStock(warehouseId);
  return { stockRecord: updated, ledgerEntry, alerts };
}

export async function checkSafetyStock(warehouseId?: string): Promise<SafetyStockAlert[]> {
  const alerts: SafetyStockAlert[] = [];

  // Get all stock records in scope
  const stockRecords = warehouseId
    ? await stockRepo.getByWarehouse(warehouseId)
    : await stockRepo.getAll();

  // Build unique warehouse+SKU pairs from actual stock
  const pairs = new Map<string, { warehouseId: string; skuId: string; totalStock: number }>();
  for (const r of stockRecords) {
    const key = `${r.warehouseId}:${r.skuId}`;
    const existing = pairs.get(key);
    if (existing) {
      existing.totalStock += r.quantity;
    } else {
      pairs.set(key, { warehouseId: r.warehouseId, skuId: r.skuId, totalStock: r.quantity });
    }
  }

  // Get explicit configs
  const configs = warehouseId
    ? await safetyStockRepo.getByWarehouse(warehouseId)
    : await safetyStockRepo.getAll();

  const configMap = new Map<string, number>();
  for (const c of configs) {
    configMap.set(`${c.warehouseId}:${c.skuId}`, c.threshold);
  }

  // Check each warehouse+SKU pair against configured or default threshold
  for (const [key, pair] of pairs) {
    const threshold = configMap.get(key) ?? SAFETY_STOCK_DEFAULT;
    if (pair.totalStock < threshold) {
      alerts.push({
        warehouseId: pair.warehouseId,
        skuId: pair.skuId,
        currentStock: pair.totalStock,
        threshold,
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  if (alerts.length > 0) {
    logger.warn('Safety stock alerts', { count: alerts.length, warehouseId });
    // Trigger low-stock notifications
    const session = getCurrentSession();
    for (const alert of alerts) {
      try {
        await dispatchNotification(
          session?.userId ?? 'system',
          NotificationType.LowStock,
          'Low Stock Alert',
          `SKU ${alert.skuId} in warehouse ${alert.warehouseId}: ${alert.currentStock}/${alert.threshold} units`,
          { skuId: alert.skuId, warehouseId: alert.warehouseId, currentStock: alert.currentStock, threshold: alert.threshold },
        );
      } catch { /* notification failure should not block inventory operation */ }
    }
  }
  return alerts;
}

export async function getStockByBin(binId: string): Promise<StockRecord[]> {
  return stockRepo.getByBin(binId);
}

export async function getStockByWarehouse(warehouseId: string): Promise<StockRecord[]> {
  return stockRepo.getByWarehouse(warehouseId);
}

export async function getLedger(): Promise<MovementEntry[]> {
  return ledgerRepo.getAll();
}
