import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  dispatchNotification,
  getAttemptLog,
  getInbox,
} from '../../src/modules/notifications/notification.service';
import {
  updateSubscription,
} from '../../src/modules/notifications/subscription.service';
import {
  seedDefaultTemplates,
} from '../../src/modules/notifications/template.service';
import { NotificationType, NotificationChannel, QueuedAttemptStatus } from '../../src/lib/types/enums';

describe('dispatchNotification — channel queueing', () => {
  beforeEach(async () => {
    await initDatabase();
    await seedDefaultTemplates();
  });
  afterEach(async () => { await resetDb(); });

  it('creates inbox item for default subscription', async () => {
    const { notification } = await dispatchNotification(
      'user-1', NotificationType.LowStock, 'Low Stock', 'SKU-1 is low',
    );
    expect(notification.id).toBeTruthy();
    expect(notification.eventType).toBe(NotificationType.LowStock);

    const inbox = await getInbox('user-1');
    expect(inbox.length).toBe(1);
  });

  it('queues SMS attempt when user is subscribed to SMS channel', async () => {
    // Subscribe user to SMS for low_stock
    await updateSubscription('user-1', NotificationType.LowStock,
      [NotificationChannel.Inbox, NotificationChannel.Sms], true);

    const { notification, queuedAttempts } = await dispatchNotification(
      'user-1', NotificationType.LowStock, 'Low Stock', 'SKU-1 is low',
    );

    expect(queuedAttempts.length).toBeGreaterThanOrEqual(1);
    expect(queuedAttempts.some(a => a.channel === NotificationChannel.Sms)).toBe(true);
    expect(queuedAttempts[0].status).toBe(QueuedAttemptStatus.Pending);
  });

  it('queues Email attempt when user is subscribed to Email channel', async () => {
    await updateSubscription('user-1', NotificationType.WaveAssigned,
      [NotificationChannel.Inbox, NotificationChannel.Email], true);

    const { queuedAttempts } = await dispatchNotification(
      'user-1', NotificationType.WaveAssigned, 'Wave', 'Assigned',
    );

    expect(queuedAttempts.some(a => a.channel === NotificationChannel.Email)).toBe(true);
  });

  it('queues OfficialAccount attempt when user is subscribed', async () => {
    await updateSubscription('user-1', NotificationType.DiscrepancyOpened,
      [NotificationChannel.Inbox, NotificationChannel.OfficialAccount], true);

    const { queuedAttempts } = await dispatchNotification(
      'user-1', NotificationType.DiscrepancyOpened, 'Discrepancy', 'Task issue',
    );

    expect(queuedAttempts.some(a => a.channel === NotificationChannel.OfficialAccount)).toBe(true);
  });

  it('queues multiple channel attempts for multi-channel subscription', async () => {
    await updateSubscription('user-1', NotificationType.FileVersionRollback,
      [NotificationChannel.Inbox, NotificationChannel.Sms, NotificationChannel.Email, NotificationChannel.OfficialAccount], true);

    const { queuedAttempts } = await dispatchNotification(
      'user-1', NotificationType.FileVersionRollback, 'Rollback', 'Version rolled back',
    );

    // Should have 3 queued attempts (sms + email + official_account; inbox is direct)
    expect(queuedAttempts.length).toBe(3);
    const channels = queuedAttempts.map(a => a.channel);
    expect(channels).toContain(NotificationChannel.Sms);
    expect(channels).toContain(NotificationChannel.Email);
    expect(channels).toContain(NotificationChannel.OfficialAccount);
  });

  it('does not queue external attempts when only inbox is subscribed', async () => {
    await updateSubscription('user-1', NotificationType.LowStock,
      [NotificationChannel.Inbox], true);

    const { queuedAttempts } = await dispatchNotification(
      'user-1', NotificationType.LowStock, 'Low Stock', 'Body',
    );

    expect(queuedAttempts.length).toBe(0);
  });

  it('queued attempts are retrievable in attempt log', async () => {
    await updateSubscription('user-1', NotificationType.LowStock,
      [NotificationChannel.Inbox, NotificationChannel.Email], true);

    const { notification } = await dispatchNotification(
      'user-1', NotificationType.LowStock, 'Alert', 'Body',
    );

    const log = await getAttemptLog(notification.id);
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].notificationId).toBe(notification.id);
  });
});
