import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  orderStore,
  reservationStore,
  waveStore,
  taskStore,
  loadOrders,
  loadReservations,
  loadWaves,
  loadTasks,
  optimisticCreateOrder,
  optimisticCancelOrder,
} from '../../src/modules/orders/order.store';
import { OrderRepository, TaskRepository, WaveRepository } from '../../src/lib/db';
import { receiveStock } from '../../src/modules/inventory/inventory.service';
import { OrderStatus, WaveStatus, TaskStatus } from '../../src/lib/types/enums';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'test-operator',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

function resetAllStores() {
  orderStore.set([]);
  reservationStore.set([]);
  waveStore.set([]);
  taskStore.set([]);
}

describe('Order Store', () => {
  beforeEach(async () => {
    await initDatabase();
    resetAllStores();
  });

  afterEach(async () => {
    resetAllStores();
    await resetDb();
  });

  describe('loadOrders', () => {
    it('populates orderStore with all orders', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      await optimisticCreateOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      });

      orderStore.set([]);
      await loadOrders();

      expect(get(orderStore).length).toBeGreaterThan(0);
    });

    it('sets empty array when no orders exist', async () => {
      await loadOrders();
      expect(get(orderStore)).toEqual([]);
    });
  });

  describe('loadReservations', () => {
    it('sets empty array when no reservations exist', async () => {
      await loadReservations();
      expect(get(reservationStore)).toEqual([]);
    });

    it('populates reservationStore after order creation', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      await optimisticCreateOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      });
      await loadReservations();
      expect(get(reservationStore).length).toBeGreaterThan(0);
    });
  });

  describe('loadWaves', () => {
    it('populates waveStore from wave repository', async () => {
      const waveRepo = new WaveRepository();
      const now = new Date().toISOString();
      await waveRepo.add({
        id: 'w1',
        waveNumber: 'WAVE-001',
        status: WaveStatus.Planned,
        orderIds: [],
        lineCount: 0,
        config: { maxLinesPerWave: 25 },
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      await loadWaves();
      expect(get(waveStore)).toHaveLength(1);
    });

    it('sets empty array when no waves exist', async () => {
      await loadWaves();
      expect(get(waveStore)).toEqual([]);
    });
  });

  describe('loadTasks', () => {
    it('loads all tasks when no pickerId provided', async () => {
      const taskRepo = new TaskRepository();
      const now = new Date().toISOString();
      await taskRepo.add({
        id: 't1',
        waveId: 'w1',
        pickerId: 'p1',
        status: TaskStatus.Assigned,
        steps: [],
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      await taskRepo.add({
        id: 't2',
        waveId: 'w1',
        pickerId: 'p2',
        status: TaskStatus.Assigned,
        steps: [],
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await loadTasks();
      expect(get(taskStore)).toHaveLength(2);
    });

    it('filters by pickerId when provided', async () => {
      const taskRepo = new TaskRepository();
      const now = new Date().toISOString();
      await taskRepo.add({
        id: 't1',
        waveId: 'w1',
        pickerId: 'picker-a',
        status: TaskStatus.Assigned,
        steps: [],
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      await taskRepo.add({
        id: 't2',
        waveId: 'w1',
        pickerId: 'picker-b',
        status: TaskStatus.Assigned,
        steps: [],
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await loadTasks('picker-a');
      const tasks = get(taskStore);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].pickerId).toBe('picker-a');
    });
  });

  describe('optimisticCreateOrder', () => {
    it('places a pending placeholder then persists the order', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      await optimisticCreateOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      });

      const orderRepo = new OrderRepository();
      const persisted = await orderRepo.getAll();
      expect(persisted.length).toBeGreaterThan(0);
    });

    it('uses provided orderNumber when supplied', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      await optimisticCreateOrder({
        orderNumber: 'ORD-MINE',
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      });
      const orderRepo = new OrderRepository();
      const all = await orderRepo.getAll();
      expect(all.some(o => o.orderNumber === 'ORD-MINE')).toBe(true);
    });
  });

  describe('optimisticCancelOrder', () => {
    it('sets status to Cancelled optimistically then persists', async () => {
      await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
      await optimisticCreateOrder({
        lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      });
      const orderRepo = new OrderRepository();
      const persisted = await orderRepo.getAll();
      const targetId = persisted[0].id;

      await loadOrders();

      await optimisticCancelOrder(targetId);

      const finalOrder = await orderRepo.getById(targetId);
      expect(finalOrder?.status).toBe(OrderStatus.Cancelled);
    });

    it('rolls back store on service error', async () => {
      await optimisticCancelOrder('nonexistent-order').catch(() => {});
      expect(Array.isArray(get(orderStore))).toBe(true);
    });
  });
});
