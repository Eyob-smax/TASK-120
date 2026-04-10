import { OrderRepository, ReservationRepository } from '$lib/db';
import { StockRecordRepository, MovementLedgerRepository } from '$lib/db';
import { validateOrder, validateReservation } from '$lib/validators';
import { ValidationServiceError } from '$lib/services/errors';
import { getCurrentSession } from '$lib/security/auth.service';
import { createLogger } from '$lib/logging';
import { getExpiredReservations } from './reservation-timer';
import {
  OrderStatus,
  ReservationStatus,
  ReleaseReason,
  MovementReason,
} from '$lib/types/enums';
import type { Order, OrderLine, Reservation } from '$lib/types/orders';
import type { MovementEntry } from '$lib/types/inventory';

const orderRepo = new OrderRepository();
const reservationRepo = new ReservationRepository();
const stockRepo = new StockRecordRepository();
const ledgerRepo = new MovementLedgerRepository();
const logger = createLogger('inventory');

function requireOperatorId(): string {
  const session = getCurrentSession();
  if (!session) throw new ValidationServiceError('Not authenticated', [
    { field: 'session', message: 'User must be logged in', code: 'unauthenticated' },
  ]);
  return session.userId;
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

export async function createOrder(
  orderData: Partial<Order> & { lines: OrderLine[] },
): Promise<{ order: Order; reservations: Reservation[] }> {
  const operatorId = requireOperatorId();

  const validation = validateOrder(orderData);
  if (!validation.valid) throw new ValidationServiceError('Invalid order', validation.errors);

  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: orderData.orderNumber ?? `ORD-${Date.now()}`,
    status: OrderStatus.Confirmed,
    lines: orderData.lines,
    customerId: orderData.customerId,
    notes: orderData.notes,
    createdBy: operatorId,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  // Phase 1: Pre-flight validation — check ALL lines before any mutation
  const lineChecks: Array<{ line: OrderLine; stockRecord: any }> = [];
  for (const line of order.lines) {
    if (!line.binId) continue;

    const stockRecords = await stockRepo.getByIndex('binId', line.binId);
    const stockRecord = stockRecords.find((r: any) => r.skuId === line.skuId);

    if (!stockRecord || stockRecord.quantity < line.quantity) {
      throw new ValidationServiceError('Insufficient stock for reservation', [
        {
          field: `line.${line.skuId}`,
          message: `Available: ${stockRecord?.quantity ?? 0}, requested: ${line.quantity}`,
          code: 'insufficient_stock',
        },
      ]);
    }
    lineChecks.push({ line, stockRecord });
  }

  // Phase 2: All validated — now perform mutations (no throw possible from stock checks)
  const reservations: Reservation[] = [];

  for (const { line, stockRecord } of lineChecks) {
    await stockRepo.put({
      ...stockRecord,
      quantity: stockRecord.quantity - line.quantity,
      updatedAt: now,
    });

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      orderId: order.id,
      skuId: line.skuId,
      binId: line.binId!,
      quantity: line.quantity,
      status: ReservationStatus.Active,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await reservationRepo.add(reservation);
    reservations.push(reservation);

    await writeLedgerEntry({
      timestamp: now,
      operatorId,
      sourceBinId: line.binId!,
      destinationBinId: null,
      skuId: line.skuId,
      quantity: line.quantity,
      reasonCode: MovementReason.ReservationHold,
      orderId: order.id,
    });

    line.reservationId = reservation.id;
  }

  order.status = OrderStatus.Reserved;
  await orderRepo.add(order);

  logger.info('Order created with reservations', {
    orderId: order.id,
    lineCount: order.lines.length,
    reservationCount: reservations.length,
  });

  return { order, reservations };
}

export async function cancelOrder(orderId: string): Promise<{
  order: Order;
  releasedReservations: Reservation[];
}> {
  const operatorId = requireOperatorId();

  const order = await orderRepo.getById(orderId);
  if (!order) throw new ValidationServiceError('Order not found', [
    { field: 'orderId', message: 'Order does not exist', code: 'not_found' },
  ]);

  const activeReservations = await reservationRepo.getByOrder(orderId);
  const toRelease = activeReservations.filter(r => r.status === ReservationStatus.Active);

  const now = new Date().toISOString();
  const releasedReservations: Reservation[] = [];

  for (const reservation of toRelease) {
    const released = await releaseReservation(reservation.id, ReleaseReason.Cancel, operatorId);
    releasedReservations.push(released);
  }

  const updatedOrder = await orderRepo.put({
    ...order,
    status: OrderStatus.Cancelled,
    updatedAt: now,
  });

  logger.info('Order cancelled', { orderId, releasedCount: releasedReservations.length });
  return { order: updatedOrder, releasedReservations };
}

export async function releaseReservation(
  reservationId: string,
  reason: ReleaseReason,
  operatorId?: string,
): Promise<Reservation> {
  const opId = operatorId ?? requireOperatorId();

  const reservation = await reservationRepo.getById(reservationId);
  if (!reservation) throw new ValidationServiceError('Reservation not found', [
    { field: 'reservationId', message: 'Reservation does not exist', code: 'not_found' },
  ]);

  const now = new Date().toISOString();

  // Return stock
  const stockRecords = await stockRepo.getByIndex('binId', reservation.binId);
  const stockRecord = stockRecords.find(r => r.skuId === reservation.skuId);
  if (stockRecord) {
    await stockRepo.put({
      ...stockRecord,
      quantity: stockRecord.quantity + reservation.quantity,
      updatedAt: now,
    });
  }

  // Write release ledger entry
  await writeLedgerEntry({
    timestamp: now,
    operatorId: opId,
    sourceBinId: null,
    destinationBinId: reservation.binId,
    skuId: reservation.skuId,
    quantity: reservation.quantity,
    reasonCode: MovementReason.ReservationRelease,
    orderId: reservation.orderId,
  });

  const released = await reservationRepo.put({
    ...reservation,
    status: ReservationStatus.Released,
    releasedAt: now,
    releaseReason: reason,
    updatedAt: now,
  });

  return released;
}

export async function releaseExpiredReservations(
  now: Date = new Date(),
): Promise<Reservation[]> {
  const allActive = await reservationRepo.getActive();
  const expired = getExpiredReservations(allActive, now);

  const released: Reservation[] = [];
  for (const reservation of expired) {
    const r = await releaseReservation(reservation.id, ReleaseReason.Timeout, 'system');
    released.push(r);
  }

  if (released.length > 0) {
    logger.info('Released expired reservations', { count: released.length });
  }
  return released;
}

export async function updateOrderActivity(orderId: string): Promise<void> {
  const reservations = await reservationRepo.getByOrder(orderId);
  const now = new Date().toISOString();

  for (const r of reservations) {
    if (r.status === ReservationStatus.Active) {
      await reservationRepo.put({ ...r, lastActivityAt: now, updatedAt: now });
    }
  }
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  return orderRepo.getById(orderId);
}

export async function getOrders(): Promise<Order[]> {
  return orderRepo.getAll();
}

export async function getReservationsByOrder(orderId: string): Promise<Reservation[]> {
  return reservationRepo.getByOrder(orderId);
}
