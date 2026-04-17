import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import { receiveStock } from '../../src/modules/inventory/inventory.service';
import {
  createOrder,
  cancelOrder,
  releaseExpiredReservations,
} from '../../src/modules/orders/order.service';
import { planWave } from '../../src/modules/orders/wave.service';
import {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  canProceedToPacking,
} from '../../src/modules/orders/discrepancy.service';
import { OrderStatus, ReservationStatus, DiscrepancyState } from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS, WAVE_DEFAULT_SIZE } from '../../src/lib/constants';
import { OrderRepository } from '../../src/lib/db';

describe('Order Screen Workflows', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
    await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
  });

  afterEach(async () => { teardownRealAuth(); await resetDb(); });

  it('create order reserves stock and sets status', async () => {
    const { order, reservations } = await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
    });
    expect(order.status).toBe(OrderStatus.Reserved);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe(ReservationStatus.Active);
  });

  it('cancel order releases reservations', async () => {
    const { order } = await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
    });
    const { releasedReservations } = await cancelOrder(order.id);
    expect(releasedReservations).toHaveLength(1);
  });

  it('release expired handles 30-min boundary', async () => {
    await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
    });

    // Not expired yet
    const notExpired = await releaseExpiredReservations(new Date());
    expect(notExpired).toHaveLength(0);

    // Past 30 min
    const future = new Date(Date.now() + RESERVATION_TIMEOUT_MS + 60000);
    const expired = await releaseExpiredReservations(future);
    expect(expired).toHaveLength(1);
  });

  it('wave plan enforces 25-line default', async () => {
    const orderRepo = new OrderRepository();
    const now = new Date().toISOString();
    const bigOrder = {
      id: crypto.randomUUID(), orderNumber: 'BIG-1', status: OrderStatus.Reserved,
      lines: Array.from({ length: 30 }, (_, i) => ({ id: `l${i}`, orderId: '', skuId: `s${i}`, binId: `b${i}`, quantity: 1 })),
      createdBy: 'u1', createdAt: now, updatedAt: now, version: 1,
    };
    await orderRepo.add(bigOrder);
    await expect(planWave([bigOrder.id])).rejects.toThrow('exceeds');
  });

  it('discrepancy blocks packing until verified', async () => {
    const d = await reportDiscrepancy('task-1', 'user-1', 'Missing item');
    expect(await canProceedToPacking('task-1')).toBe(false);

    const d2 = await reviewDiscrepancy(d.id);
    expect(await canProceedToPacking('task-1')).toBe(false);

    await verifyDiscrepancy(d2.id, 'verifier', 'Confirmed');
    expect(await canProceedToPacking('task-1')).toBe(true);
  });
});
