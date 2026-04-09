import { SubscriptionRepository } from '$lib/db';
import { NotificationType, NotificationChannel } from '$lib/types/enums';
import type { Subscription } from '$lib/types/notifications';

const subRepo = new SubscriptionRepository();

export function getDefaultSubscriptions(): Array<{ eventType: NotificationType; channels: NotificationChannel[] }> {
  return Object.values(NotificationType).map(eventType => ({
    eventType,
    channels: [NotificationChannel.Inbox, NotificationChannel.Sms, NotificationChannel.Email, NotificationChannel.OfficialAccount],
  }));
}

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  return subRepo.getByUser(userId);
}

export async function updateSubscription(
  userId: string,
  eventType: NotificationType,
  channels: NotificationChannel[],
  enabled: boolean,
): Promise<Subscription> {
  const existing = await subRepo.getByUser(userId);
  const match = existing.find(s => s.eventType === eventType);
  const now = new Date().toISOString();

  if (match) {
    return subRepo.put({ ...match, channels, enabled, updatedAt: now });
  }

  const sub: Subscription = {
    id: crypto.randomUUID(),
    userId,
    eventType,
    channels,
    enabled,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await subRepo.add(sub);
  return sub;
}

export async function isSubscribed(userId: string, eventType: NotificationType): Promise<boolean> {
  const subs = await subRepo.getByUser(userId);
  const match = subs.find(s => s.eventType === eventType);
  return match ? match.enabled : true; // Default subscribed
}
