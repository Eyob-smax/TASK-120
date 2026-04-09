/**
 * Critical-path E2E smoke test
 *
 * Exercises the full happy-path flow through the service layer:
 *   login → create order → plan wave → assign task → report discrepancy →
 *   review → verify → notification dispatch evidence
 *
 * Runs in jsdom/fake-indexeddb (no real browser). This validates that all
 * service-layer modules compose correctly end-to-end.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../src/lib/db/connection';
import { receiveStock } from '../src/modules/inventory/inventory.service';
import { createOrder } from '../src/modules/orders/order.service';
import { planWave, assignTask, startWave, startTask, completeTask } from '../src/modules/orders/wave.service';
import {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  canProceedToPacking,
} from '../src/modules/orders/discrepancy.service';
import {
  dispatchNotification,
  getInbox,
  getAttemptLog,
  processRetries,
} from '../src/modules/notifications/notification.service';
import {
  updateSubscription,
} from '../src/modules/notifications/subscription.service';
import { seedDefaultTemplates } from '../src/modules/notifications/template.service';
import {
  OrderStatus,
  NotificationType,
  NotificationChannel,
  QueuedAttemptStatus,
} from '../src/lib/types/enums';

import { getSubscriptions } from '../src/modules/notifications/subscription.service';

vi.mock('../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'test-user',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

describe('Critical-path E2E smoke: Order → Wave → Discrepancy → Notifications', () => {
  beforeEach(async () => {
    await initDatabase();
    await seedDefaultTemplates();
  });
  afterEach(async () => { await resetDb(); });

  it('full flow with notification evidence at every business event', async () => {
    // --- 1. Subscribe user to Email + Inbox for discrepancy events ---
    await updateSubscription('test-user', NotificationType.DiscrepancyOpened,
      [NotificationChannel.Inbox, NotificationChannel.Email], true);
    await updateSubscription('test-user', NotificationType.DiscrepancyClosed,
      [NotificationChannel.Inbox, NotificationChannel.Email], true);
    await updateSubscription('test-user', NotificationType.WaveAssigned,
      [NotificationChannel.Inbox, NotificationChannel.Sms], true);

    // --- 2. Seed stock and create order ---
    await receiveStock('bin-A1', 'sku-100', 'wh-1', 50);

    const { order, reservations } = await createOrder({
      lines: [{ id: 'l1', orderId: '', skuId: 'sku-100', binId: 'bin-A1', quantity: 10 }],
    });
    expect(order.status).toBe(OrderStatus.Reserved);
    expect(reservations).toHaveLength(1);

    // --- 3. Plan and start wave ---
    const wave = await planWave([order.id]);
    expect(wave.lineCount).toBe(1);
    await startWave(wave.id);

    // --- 4. Assign task (triggers WaveAssigned notification) ---
    const task = await assignTask(wave.id, 'test-user', {
      sortBy: 'zone_then_bin',
      zonePriority: ['A'],
    });
    expect(task.pickerId).toBe('test-user');

    // Verify WaveAssigned notification created + SMS attempt queued
    const inboxAfterAssign = await getInbox('test-user');
    const waveNotif = inboxAfterAssign.find(n => n.eventType === NotificationType.WaveAssigned);
    expect(waveNotif).toBeTruthy();

    if (waveNotif) {
      const waveAttempts = await getAttemptLog(waveNotif.id);
      expect(waveAttempts.some(a => a.channel === NotificationChannel.Sms)).toBe(true);
    }

    // --- 4b. Start task (picker begins execution) ---
    const startedTask = await startTask(task.id);
    expect(startedTask.status).toBe('in_progress');
    expect(startedTask.startedAt).toBeTruthy();

    // --- 5. Report discrepancy (triggers DiscrepancyOpened notification) ---
    const disc = await reportDiscrepancy(task.id, 'test-user', 'Item missing from bin');
    expect(await canProceedToPacking(task.id)).toBe(false);

    const inboxAfterDisc = await getInbox('test-user');
    const discNotif = inboxAfterDisc.find(n => n.eventType === NotificationType.DiscrepancyOpened);
    expect(discNotif).toBeTruthy();

    if (discNotif) {
      const discAttempts = await getAttemptLog(discNotif.id);
      expect(discAttempts.some(a => a.channel === NotificationChannel.Email)).toBe(true);
      expect(discAttempts[0].status).toBe(QueuedAttemptStatus.Pending);
    }

    // --- 6. Review + verify discrepancy (unblocks packing) ---
    const reviewed = await reviewDiscrepancy(disc.id);
    await verifyDiscrepancy(reviewed.id, 'manager-1', 'Confirmed shortage');
    expect(await canProceedToPacking(task.id)).toBe(true);

    // --- 6b. Complete task (now unblocked by verified discrepancy) ---
    const completedTask = await completeTask(task.id);
    expect(completedTask.status).toBe('completed');
    expect(completedTask.completedAt).toBeTruthy();

    // --- 7. Process notification retries ---
    const retryResult = await processRetries(new Date());
    // At least the queued attempts from wave + discrepancy should process
    expect(retryResult.processed).toBeGreaterThanOrEqual(2);
    // Each processed attempt should schedule a next retry (retry #1)
    expect(retryResult.scheduledNext).toBeGreaterThanOrEqual(2);

    // --- 8. Verify complete attempt log ---
    const fullLog = await getAttemptLog();
    // Should have initial attempts + retry attempts
    expect(fullLog.length).toBeGreaterThanOrEqual(4);
    // All initial attempts should now be Simulated
    const simulated = fullLog.filter(a => a.status === QueuedAttemptStatus.Simulated);
    expect(simulated.length).toBeGreaterThanOrEqual(2);
    // Retry attempts should be Pending
    const pending = fullLog.filter(a => a.status === QueuedAttemptStatus.Pending);
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Channel-selection persistence drives queued-attempt creation', () => {
  beforeEach(async () => {
    await initDatabase();
    await seedDefaultTemplates();
  });
  afterEach(async () => { await resetDb(); });

  it('user channel preferences persist and control which external attempts are queued', async () => {
    // 1. Set up multi-channel subscription
    await updateSubscription('user-A', NotificationType.LowStock,
      [NotificationChannel.Inbox, NotificationChannel.Sms, NotificationChannel.OfficialAccount], true);

    // 2. Verify subscription persisted correctly
    const subs = await getSubscriptions('user-A');
    const lowStockSub = subs.find(s => s.eventType === NotificationType.LowStock);
    expect(lowStockSub).toBeTruthy();
    expect(lowStockSub!.channels).toContain(NotificationChannel.Sms);
    expect(lowStockSub!.channels).toContain(NotificationChannel.OfficialAccount);
    expect(lowStockSub!.enabled).toBe(true);

    // 3. Dispatch notification — should queue SMS + OfficialAccount (not Email)
    const { notification, queuedAttempts } = await dispatchNotification(
      'user-A', NotificationType.LowStock, 'Low Stock', 'SKU below threshold',
    );
    expect(notification.id).toBeTruthy();
    expect(queuedAttempts.length).toBe(2);

    const channels = queuedAttempts.map(a => a.channel);
    expect(channels).toContain(NotificationChannel.Sms);
    expect(channels).toContain(NotificationChannel.OfficialAccount);
    expect(channels).not.toContain(NotificationChannel.Email);

    // 4. Update subscription to remove SMS, add Email
    await updateSubscription('user-A', NotificationType.LowStock,
      [NotificationChannel.Inbox, NotificationChannel.Email, NotificationChannel.OfficialAccount], true);

    // 5. Dispatch again — should now queue Email + OfficialAccount (not SMS)
    const { queuedAttempts: qa2 } = await dispatchNotification(
      'user-A', NotificationType.LowStock, 'Low Stock Again', 'Still below threshold',
    );
    expect(qa2.length).toBe(2);
    const channels2 = qa2.map(a => a.channel);
    expect(channels2).toContain(NotificationChannel.Email);
    expect(channels2).toContain(NotificationChannel.OfficialAccount);
    expect(channels2).not.toContain(NotificationChannel.Sms);

    // 6. Disable subscription entirely — should queue nothing
    await updateSubscription('user-A', NotificationType.LowStock,
      [NotificationChannel.Inbox, NotificationChannel.Email], false);

    const { queuedAttempts: qa3 } = await dispatchNotification(
      'user-A', NotificationType.LowStock, 'Low Stock Third', 'Body',
    );
    // Subscription disabled → no external channels queued (inbox-only is always created)
    expect(qa3.length).toBe(0);
  });
});
