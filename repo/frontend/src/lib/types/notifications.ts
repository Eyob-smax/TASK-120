import type { BaseEntity } from './common';
import type {
  NotificationType,
  NotificationChannel,
  QueuedAttemptStatus,
} from './enums';

export interface Notification extends BaseEntity {
  userId: string;
  eventType: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
}

export interface QueuedAttempt extends BaseEntity {
  notificationId: string;
  channel: NotificationChannel;
  templateId: string;
  attemptNumber: number;
  scheduledAt: string;
  status: QueuedAttemptStatus;
  processedAt?: string;
}

export interface NotificationTemplate extends BaseEntity {
  eventType: NotificationType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
}

export interface Subscription extends BaseEntity {
  userId: string;
  eventType: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface ReadReceipt extends BaseEntity {
  notificationId: string;
  userId: string;
  readAt: string;
}
