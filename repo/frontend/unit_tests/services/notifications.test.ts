import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  createInboxItem,
  markAsRead,
  queueExternalAttempt,
  processRetries,
  getInbox,
  getUnread,
  getAttemptLog,
} from '../../src/modules/notifications/notification.service';
import {
  getSubscriptions,
  updateSubscription,
  isSubscribed,
} from '../../src/modules/notifications/subscription.service';
import { NotificationType, NotificationChannel, QueuedAttemptStatus } from '../../src/lib/types/enums';
import { NOTIFICATION_RETRY_DELAYS, MAX_NOTIFICATION_RETRIES } from '../../src/lib/constants';
import { getNextRetryTimestamp, isMaxRetriesReached } from '../../src/modules/notifications/retry-scheduler';

describe('Notification Service', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('createInboxItem writes to IndexedDB', async () => {
    const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Low Stock', 'SKU-1 is low');
    expect(notif.id).toBeTruthy();
    expect(notif.userId).toBe('user-1');
    expect(notif.eventType).toBe(NotificationType.LowStock);

    const inbox = await getInbox('user-1');
    expect(inbox.length).toBe(1);
  });

  it('markAsRead records a read receipt', async () => {
    const notif = await createInboxItem('user-1', NotificationType.WaveAssigned, 'Wave', 'Assigned');
    const receipt = await markAsRead(notif.id, 'user-1');
    expect(receipt.readAt).toBeTruthy();

    const unread = await getUnread('user-1');
    expect(unread.length).toBe(0);
  });

  it('queueExternalAttempt creates a pending attempt', async () => {
    const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Alert', 'Body');
    const attempt = await queueExternalAttempt(notif.id, NotificationChannel.Email, 'tmpl-1');
    expect(attempt.status).toBe(QueuedAttemptStatus.Pending);
    expect(attempt.attemptNumber).toBe(1);
  });

  it('processRetries simulates overdue attempts and schedules next', async () => {
    const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Alert', 'Body');
    const attempt = await queueExternalAttempt(notif.id, NotificationChannel.Sms, 'tmpl-1');

    // Process immediately (attempt was scheduled for now)
    const result = await processRetries(new Date());
    expect(result.processed).toBe(1);
    expect(result.scheduledNext).toBe(1);

    // Should have a new pending attempt
    const log = await getAttemptLog(notif.id);
    expect(log.length).toBe(2);
  });

  it('marks as skipped after max retries', async () => {
    const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Alert', 'Body');

    // Attempt 4 = 3rd retry (delays array exhausted → no further retries)
    // Attempt numbering: 1 = initial, 2 = retry#1, 3 = retry#2, 4 = retry#3
    const { QueuedAttemptRepository } = await import('../../src/lib/db');
    const repo = new QueuedAttemptRepository();
    const now = new Date().toISOString();
    await repo.add({
      id: crypto.randomUUID(),
      notificationId: notif.id,
      channel: NotificationChannel.Email,
      templateId: 'tmpl-1',
      attemptNumber: 4,
      scheduledAt: now,
      status: QueuedAttemptStatus.Pending,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    const result = await processRetries(new Date());
    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.scheduledNext).toBe(0);
  });
});

describe('Subscription Service', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('creates and retrieves subscriptions', async () => {
    await updateSubscription('user-1', NotificationType.LowStock, [NotificationChannel.Inbox], true);
    const subs = await getSubscriptions('user-1');
    expect(subs.length).toBe(1);
    expect(subs[0].enabled).toBe(true);
  });

  it('updates existing subscription', async () => {
    await updateSubscription('user-1', NotificationType.LowStock, [NotificationChannel.Inbox], true);
    await updateSubscription('user-1', NotificationType.LowStock, [NotificationChannel.Inbox], false);
    const subs = await getSubscriptions('user-1');
    expect(subs.length).toBe(1);
    expect(subs[0].enabled).toBe(false);
  });

  it('isSubscribed returns true by default', async () => {
    const result = await isSubscribed('user-1', NotificationType.WaveAssigned);
    expect(result).toBe(true);
  });
});

describe('Retry policy — 3 retries at 1, 5, 15 minutes', () => {
  it('NOTIFICATION_RETRY_DELAYS length equals MAX_NOTIFICATION_RETRIES', () => {
    expect(NOTIFICATION_RETRY_DELAYS.length).toBe(MAX_NOTIFICATION_RETRIES);
  });

  it('getNextRetryTimestamp returns correct delay for each attempt', () => {
    const base = '2026-01-01T00:00:00.000Z';

    // After attempt 1 → retry at +1 min
    const t1 = getNextRetryTimestamp(1, base);
    expect(t1).toBe(new Date(new Date(base).getTime() + 60_000).toISOString());

    // After attempt 2 → retry at +5 min
    const t2 = getNextRetryTimestamp(2, base);
    expect(t2).toBe(new Date(new Date(base).getTime() + 300_000).toISOString());

    // After attempt 3 → retry at +15 min
    const t3 = getNextRetryTimestamp(3, base);
    expect(t3).toBe(new Date(new Date(base).getTime() + 900_000).toISOString());

    // After attempt 4 → no more retries
    expect(getNextRetryTimestamp(4, base)).toBeNull();
  });

  it('isMaxRetriesReached is false for attempts 1–3, true from 4+', () => {
    expect(isMaxRetriesReached(1)).toBe(false);
    expect(isMaxRetriesReached(2)).toBe(false);
    expect(isMaxRetriesReached(3)).toBe(false);
    expect(isMaxRetriesReached(4)).toBe(true);
    expect(isMaxRetriesReached(5)).toBe(true);
  });

  it('full retry chain: initial → 3 retries → stop', async () => {
    await resetDb();
    await initDatabase();

    try {
      const notif = await createInboxItem('user-1', NotificationType.LowStock, 'Alert', 'Body');
      const attempt = await queueExternalAttempt(notif.id, NotificationChannel.Email, 'tmpl-1');

      // Attempt 1 (initial) → should schedule retry #1
      let result = await processRetries(new Date());
      expect(result.processed).toBe(1);
      expect(result.scheduledNext).toBe(1);
      expect(result.skipped).toBe(0);

      let log = await getAttemptLog(notif.id);
      expect(log.length).toBe(2); // attempt 1 (simulated) + attempt 2 (pending)
      const attempt2 = log.find(a => a.attemptNumber === 2);
      expect(attempt2).toBeTruthy();
      expect(attempt2!.status).toBe(QueuedAttemptStatus.Pending);

      // Attempt 2 (retry #1) → should schedule retry #2
      const t2 = new Date(attempt2!.scheduledAt);
      result = await processRetries(t2);
      expect(result.processed).toBe(1);
      expect(result.scheduledNext).toBe(1);

      log = await getAttemptLog(notif.id);
      expect(log.length).toBe(3);
      const attempt3 = log.find(a => a.attemptNumber === 3);
      expect(attempt3).toBeTruthy();

      // Attempt 3 (retry #2) → should schedule retry #3
      const t3 = new Date(attempt3!.scheduledAt);
      result = await processRetries(t3);
      expect(result.processed).toBe(1);
      expect(result.scheduledNext).toBe(1);

      log = await getAttemptLog(notif.id);
      expect(log.length).toBe(4);
      const attempt4 = log.find(a => a.attemptNumber === 4);
      expect(attempt4).toBeTruthy();

      // Attempt 4 (retry #3, the last) → no more retries
      const t4 = new Date(attempt4!.scheduledAt);
      result = await processRetries(t4);
      expect(result.processed).toBe(1);
      expect(result.scheduledNext).toBe(0);
      expect(result.skipped).toBe(1);

      // Total attempts: 4 (1 initial + 3 retries)
      log = await getAttemptLog(notif.id);
      expect(log.length).toBe(4);
    } finally {
      await resetDb();
    }
  });
});
