import {
  NotificationRepository,
  QueuedAttemptRepository,
  ReadReceiptRepository,
} from '$lib/db';
import { createLogger } from '$lib/logging';
import { getNextRetryTimestamp, getOverdueAttempts } from './retry-scheduler';
import { NotificationType, NotificationChannel, QueuedAttemptStatus } from '$lib/types/enums';
import type { Notification, QueuedAttempt, ReadReceipt } from '$lib/types/notifications';
import { getSubscriptions } from './subscription.service';
import { getTemplateByEvent } from './template.service';

const notifRepo = new NotificationRepository();
const attemptRepo = new QueuedAttemptRepository();
const receiptRepo = new ReadReceiptRepository();
const logger = createLogger('notifications');

export async function createInboxItem(
  userId: string,
  eventType: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<Notification> {
  const now = new Date().toISOString();
  const notif: Notification = {
    id: crypto.randomUUID(),
    userId,
    eventType,
    title,
    body,
    data,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await notifRepo.add(notif);
  logger.info('Inbox item created', { userId, eventType, title });
  return notif;
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<ReadReceipt> {
  const notif = await notifRepo.getById(notificationId);
  if (notif && !notif.readAt) {
    await notifRepo.put({ ...notif, readAt: new Date().toISOString() });
  }

  const now = new Date().toISOString();
  const receipt: ReadReceipt = {
    id: crypto.randomUUID(),
    notificationId,
    userId,
    readAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await receiptRepo.add(receipt);
  return receipt;
}

export async function queueExternalAttempt(
  notificationId: string,
  channel: NotificationChannel,
  templateId: string,
): Promise<QueuedAttempt> {
  const now = new Date().toISOString();
  const attempt: QueuedAttempt = {
    id: crypto.randomUUID(),
    notificationId,
    channel,
    templateId,
    attemptNumber: 1,
    scheduledAt: now,
    status: QueuedAttemptStatus.Pending,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await attemptRepo.add(attempt);
  logger.info('External attempt queued', { notificationId, channel });
  return attempt;
}

export async function processRetries(now: Date = new Date()): Promise<{
  processed: number;
  scheduledNext: number;
  skipped: number;
}> {
  const allPending = await attemptRepo.getPending();
  const overdue = getOverdueAttempts(allPending, now);

  let processed = 0;
  let scheduledNext = 0;
  let skipped = 0;

  for (const attempt of overdue) {
    // Simulate the attempt (external channels are audit-only)
    await attemptRepo.put({
      ...attempt,
      status: QueuedAttemptStatus.Simulated,
      processedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    processed++;

    // Schedule next retry if delays remain, otherwise mark as done.
    // getNextRetryTimestamp returns null once NOTIFICATION_RETRY_DELAYS is
    // exhausted, which naturally caps retries at 3.
    const nextTimestamp = getNextRetryTimestamp(attempt.attemptNumber, now.toISOString());
    if (nextTimestamp) {
      const nextAttempt: QueuedAttempt = {
        id: crypto.randomUUID(),
        notificationId: attempt.notificationId,
        channel: attempt.channel,
        templateId: attempt.templateId,
        attemptNumber: attempt.attemptNumber + 1,
        scheduledAt: nextTimestamp,
        status: QueuedAttemptStatus.Pending,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        version: 1,
      };
      await attemptRepo.add(nextAttempt);
      scheduledNext++;
    } else {
      skipped++;
    }
  }

  if (processed > 0) {
    logger.info('Retries processed', { processed, scheduledNext, skipped });
  }
  return { processed, scheduledNext, skipped };
}

export async function getInbox(userId: string): Promise<Notification[]> {
  return notifRepo.getByUser(userId);
}

export async function getUnread(userId: string): Promise<Notification[]> {
  return notifRepo.getUnread(userId);
}

export async function getAttemptLog(notificationId?: string): Promise<QueuedAttempt[]> {
  if (notificationId) {
    return attemptRepo.getByNotification(notificationId);
  }
  return attemptRepo.getAll();
}

/**
 * Centralized notification dispatch: creates inbox item AND queues
 * external-channel attempts for any non-inbox subscribed channels.
 * This is the single entry point business events should use.
 */
export async function dispatchNotification(
  userId: string,
  eventType: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ notification: Notification; queuedAttempts: QueuedAttempt[] }> {
  // 1. Always create inbox item
  const notification = await createInboxItem(userId, eventType, title, body, data);

  // 2. Check user subscriptions for non-inbox channels
  const queuedAttempts: QueuedAttempt[] = [];
  try {
    const subscriptions = await getSubscriptions(userId);
    const sub = subscriptions.find(s => s.eventType === eventType && s.enabled);
    const channels = sub?.channels ?? [NotificationChannel.Inbox];

    for (const channel of channels) {
      if (channel === NotificationChannel.Inbox) continue; // already handled above

      // Find template for this event+channel
      const template = await getTemplateByEvent(eventType, channel);
      if (template) {
        const attempt = await queueExternalAttempt(notification.id, channel, template.id);
        queuedAttempts.push(attempt);
      }
    }
  } catch (e) {
    // Subscription/queue failures should not block the primary notification
    logger.warn('Failed to queue external attempts', { eventType, error: (e as Error).message });
  }

  if (queuedAttempts.length > 0) {
    logger.info('External attempts queued', { notificationId: notification.id, channels: queuedAttempts.map(a => a.channel) });
  }

  return { notification, queuedAttempts };
}
