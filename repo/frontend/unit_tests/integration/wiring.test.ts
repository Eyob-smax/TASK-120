import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { receiveStock } from '../../src/modules/inventory/inventory.service';
import {
  createOrder,
  cancelOrder,
  releaseExpiredReservations,
} from '../../src/modules/orders/order.service';
import { planWave, assignTask, startWave } from '../../src/modules/orders/wave.service';
import {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  canProceedToPacking,
} from '../../src/modules/orders/discrepancy.service';
import { ingestFile } from '../../src/modules/files/file.service';
import { ChunkScheduler } from '../../src/modules/files/chunk-scheduler';
import { deleteFile, restoreFile } from '../../src/modules/files/recycle-bin.service';
import { createVersion } from '../../src/modules/files/version.service';
import {
  createInboxItem,
  markAsRead,
} from '../../src/modules/notifications/notification.service';
import {
  updateSubscription,
  getSubscriptions,
} from '../../src/modules/notifications/subscription.service';
import { OrderRepository, FileRepository } from '../../src/lib/db';
import { OrderStatus, ReservationStatus, NotificationType, NotificationChannel } from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '../../src/lib/constants';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'test-user', role: 'administrator',
    loginAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

const hasWebCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

describe('End-to-End Wiring: Order → Reserve → Cancel', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('full flow: create order reserves stock, cancel releases it', async () => {
    // Setup stock
    await receiveStock('bin-1', 'sku-1', 'wh-1', 100);

    // Create order with reservation
    const { order, reservations } = await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 20 }],
    });
    expect(order.status).toBe(OrderStatus.Reserved);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe(ReservationStatus.Active);

    // Cancel order releases reservation
    const { releasedReservations } = await cancelOrder(order.id);
    expect(releasedReservations).toHaveLength(1);
    expect(releasedReservations[0].releaseReason).toBe('cancel');
  });

  it('full flow: expired reservation auto-released', async () => {
    await receiveStock('bin-1', 'sku-1', 'wh-1', 100);
    await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 10 }],
    });

    const future = new Date(Date.now() + RESERVATION_TIMEOUT_MS + 60000);
    const released = await releaseExpiredReservations(future);
    expect(released).toHaveLength(1);
  });
});

describe('End-to-End Wiring: Wave → Task → Discrepancy → Packing Gate', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('full flow: plan wave, assign task, report discrepancy, verify, check packing', async () => {
    // Seed order
    const orderRepo = new OrderRepository();
    const now = new Date().toISOString();
    const order = {
      id: crypto.randomUUID(), orderNumber: 'ORD-1', status: OrderStatus.Reserved,
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-1', binId: 'bin-1', quantity: 5 }],
      createdBy: 'test-user', createdAt: now, updatedAt: now, version: 1,
    };
    await orderRepo.add(order);

    // Plan wave
    const wave = await planWave([order.id]);
    expect(wave.lineCount).toBe(1);

    // Start wave
    await startWave(wave.id);

    // Assign task
    const task = await assignTask(wave.id, 'picker-1', { sortBy: 'zone_then_bin', zonePriority: ['A'] });
    expect(task.pickerId).toBe('picker-1');

    // Report discrepancy blocks packing
    const disc = await reportDiscrepancy(task.id, 'picker-1', 'Missing item');
    expect(await canProceedToPacking(task.id)).toBe(false);

    // Review + verify unblocks packing
    const reviewed = await reviewDiscrepancy(disc.id);
    await verifyDiscrepancy(reviewed.id, 'manager-1', 'Confirmed missing');
    expect(await canProceedToPacking(task.id)).toBe(true);
  });
});

describe.skipIf(!hasWebCrypto)('End-to-End Wiring: File Upload → Chunks → Version', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('full flow: ingest file, schedule chunks, complete, create version', async () => {
    const data = new Uint8Array(1024).buffer;
    const { file, session, deduplicated } = await ingestFile('test.txt', 1024, 'text/plain', data, 'user-1');
    expect(deduplicated).toBe(false);
    expect(session).not.toBeNull();

    // Schedule chunks
    const scheduler = new ChunkScheduler();
    await scheduler.scheduleChunks(session!.id, data, (completed, total) => {
      expect(completed).toBeLessThanOrEqual(total);
    });

    // Create version
    const { version } = await createVersion(file.id, file.sha256, file.size, 'user-1');
    expect(version.versionNumber).toBe(1);
  });
});

describe('End-to-End Wiring: File Delete → Recycle Bin → Restore', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('full flow: delete file, restore from recycle bin', async () => {
    const fileRepo = new FileRepository();
    const now = new Date().toISOString();
    await fileRepo.add({
      id: 'f1', name: 'doc.txt', mimeType: 'text/plain', size: 100,
      sha256: 'hash1', currentVersionId: '', createdBy: 'u1', isDeleted: false,
      createdAt: now, updatedAt: now, version: 1,
    });

    const entry = await deleteFile('f1', 'u1');
    let file = await fileRepo.getById('f1');
    expect(file?.isDeleted).toBe(true);

    const restored = await restoreFile(entry.id);
    expect(restored.isDeleted).toBe(false);
  });
});

describe('End-to-End Wiring: Notification → Read → Subscription', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('full flow: create inbox item, mark read, manage subscription', async () => {
    const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Low Stock', 'SKU-1');
    expect(notif.readAt).toBeUndefined();

    const receipt = await markAsRead(notif.id, 'user-1');
    expect(receipt.readAt).toBeTruthy();

    await updateSubscription('user-1', NotificationType.LowStock, [NotificationChannel.Inbox], false);
    const subs = await getSubscriptions('user-1');
    expect(subs.find(s => s.eventType === NotificationType.LowStock)?.enabled).toBe(false);
  });
});
