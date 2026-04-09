import { Repository } from '../repository';
import { STORE_NAMES } from '../schema';
import { QueuedAttemptStatus } from '$lib/types/enums';
import type {
  Notification,
  QueuedAttempt,
  Subscription,
  ReadReceipt,
  NotificationTemplate,
} from '$lib/types/notifications';
import type { NotificationType } from '$lib/types/enums';

export class NotificationRepository extends Repository<Notification> {
  constructor() {
    super(STORE_NAMES.NOTIFICATIONS);
  }

  async getByUser(userId: string): Promise<Notification[]> {
    return this.getByIndex('userId', userId);
  }

  async getUnread(userId: string): Promise<Notification[]> {
    const all = await this.getByUser(userId);
    return all.filter(n => !n.readAt);
  }

  async getByEventType(eventType: NotificationType): Promise<Notification[]> {
    return this.getByIndex('eventType', eventType);
  }
}

export class QueuedAttemptRepository extends Repository<QueuedAttempt> {
  constructor() {
    super(STORE_NAMES.QUEUED_ATTEMPTS);
  }

  async getPending(): Promise<QueuedAttempt[]> {
    return this.getByIndex('status', QueuedAttemptStatus.Pending);
  }

  async getOverdue(now: Date = new Date()): Promise<QueuedAttempt[]> {
    const pending = await this.getPending();
    return pending.filter(a => new Date(a.scheduledAt).getTime() <= now.getTime());
  }

  async getByNotification(notificationId: string): Promise<QueuedAttempt[]> {
    return this.getByIndex('notificationId', notificationId);
  }
}

export class SubscriptionRepository extends Repository<Subscription> {
  constructor() {
    super(STORE_NAMES.SUBSCRIPTIONS);
  }

  async getByUser(userId: string): Promise<Subscription[]> {
    return this.getByIndex('userId', userId);
  }

  async getByEventType(eventType: NotificationType): Promise<Subscription[]> {
    return this.getByIndex('eventType', eventType);
  }
}

export class ReadReceiptRepository extends Repository<ReadReceipt> {
  constructor() {
    super(STORE_NAMES.READ_RECEIPTS);
  }

  async getByNotification(notificationId: string): Promise<ReadReceipt[]> {
    return this.getByIndex('notificationId', notificationId);
  }

  async getByUser(userId: string): Promise<ReadReceipt[]> {
    return this.getByIndex('userId', userId);
  }
}
