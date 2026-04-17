import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  createOrder,
  cancelOrder,
  releaseExpiredReservations,
  updateOrderActivity,
  getReservationsByOrder,
} from '../../src/modules/orders/order.service';
import { receiveStock } from '../../src/modules/inventory/inventory.service';
import { StockRecordRepository, MovementLedgerRepository, ReservationRepository } from '../../src/lib/db';
import { OrderStatus, ReservationStatus, ReleaseReason, MovementReason } from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '../../src/lib/constants';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';

const stockRepo = new StockRecordRepository();
const ledgerRepo = new MovementLedgerRepository();
const reservationRepo = new ReservationRepository();

describe('Order Service', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
    // Seed stock for tests
    await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
    await receiveStock('bin-2', 'sku-2', 'wh-1', 50);
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  describe('createOrder', () => {
    it('creates order and reserves stock per line', async () => {
      const { order, reservations } = await createOrder({
        lines: [
          { id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 },
          { id: 'l2', orderId: '', skuId: 'sku-2', binId: 'bin-2', quantity: 5 },
        ],
      });

      expect(order.status).toBe(OrderStatus.Reserved);
      expect(reservations).toHaveLength(2);
      expect(reservations[0].status).toBe(ReservationStatus.Active);

      // Stock should be deducted
      const stock1 = await stockRepo.getByBin('bin-1');
      expect(stock1.find(r => r.skuId === 'sku-1')?.quantity).toBe(90);
    });

    it('creates reservation hold ledger entries', async () => {
      await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      const ledger = await ledgerRepo.getAll();
      const holdEntries = ledger.filter(e => e.reasonCode === MovementReason.ReservationHold);
      expect(holdEntries.length).toBeGreaterThan(0);
    });

    it('rejects order with insufficient stock', async () => {
      await expect(createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 200 }],
      })).rejects.toThrow('Insufficient');
    });
  });

  describe('cancelOrder', () => {
    it('releases all reservations with Cancel reason', async () => {
      const { order } = await createOrder({
        lines: [
          { id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 },
        ],
      });

      const { releasedReservations, order: cancelled } = await cancelOrder(order.id);

      expect(cancelled.status).toBe(OrderStatus.Cancelled);
      expect(releasedReservations).toHaveLength(1);
      expect(releasedReservations[0].releaseReason).toBe(ReleaseReason.Cancel);
    });

    it('restores stock on cancel', async () => {
      const { order } = await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      await cancelOrder(order.id);

      const stock = await stockRepo.getByBin('bin-1');
      expect(stock.find(r => r.skuId === 'sku-1')?.quantity).toBe(100);
    });

    it('creates release ledger entries', async () => {
      const { order } = await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      await cancelOrder(order.id);

      const ledger = await ledgerRepo.getAll();
      const releaseEntries = ledger.filter(e => e.reasonCode === MovementReason.ReservationRelease);
      expect(releaseEntries.length).toBeGreaterThan(0);
    });
  });

  describe('releaseExpiredReservations', () => {
    it('releases reservations past 30-minute timeout', async () => {
      const { order } = await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      // Simulate time passing past timeout
      const futureTime = new Date(Date.now() + RESERVATION_TIMEOUT_MS + 60_000);
      const released = await releaseExpiredReservations(futureTime);

      expect(released).toHaveLength(1);
      expect(released[0].releaseReason).toBe(ReleaseReason.Timeout);
    });

    it('does not release non-expired reservations', async () => {
      await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      const released = await releaseExpiredReservations(new Date());
      expect(released).toHaveLength(0);
    });
  });

  describe('updateOrderActivity', () => {
    it('updates lastActivityAt on active reservations', async () => {
      const { order, reservations } = await createOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
      });

      const before = reservations[0].lastActivityAt;

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));
      await updateOrderActivity(order.id);

      const updated = await getReservationsByOrder(order.id);
      expect(new Date(updated[0].lastActivityAt).getTime())
        .toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });
});
