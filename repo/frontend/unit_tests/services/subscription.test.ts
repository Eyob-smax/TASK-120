import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  getDefaultSubscriptions,
  getSubscriptions,
  updateSubscription,
  isSubscribed,
} from '../../src/modules/notifications/subscription.service';
import { NotificationType, NotificationChannel } from '../../src/lib/types/enums';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'u1',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

describe('Subscription Service', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe('getDefaultSubscriptions', () => {
    it('returns one entry per NotificationType', () => {
      const defaults = getDefaultSubscriptions();
      expect(defaults).toHaveLength(Object.values(NotificationType).length);
    });

    it('every entry includes all four channels', () => {
      const defaults = getDefaultSubscriptions();
      for (const entry of defaults) {
        expect(entry.channels).toContain(NotificationChannel.Inbox);
        expect(entry.channels).toContain(NotificationChannel.Sms);
        expect(entry.channels).toContain(NotificationChannel.Email);
        expect(entry.channels).toContain(NotificationChannel.OfficialAccount);
      }
    });

    it('entries use valid NotificationType values', () => {
      const defaults = getDefaultSubscriptions();
      const validTypes = Object.values(NotificationType);
      for (const entry of defaults) {
        expect(validTypes).toContain(entry.eventType);
      }
    });
  });

  describe('getSubscriptions', () => {
    it('returns empty array for unknown user', async () => {
      const subs = await getSubscriptions('nobody');
      expect(subs).toEqual([]);
    });

    it('returns subscriptions scoped to user', async () => {
      await updateSubscription('u1', NotificationType.LowStock, [NotificationChannel.Inbox], true);
      await updateSubscription('u2', NotificationType.LowStock, [NotificationChannel.Email], false);

      const subsU1 = await getSubscriptions('u1');
      expect(subsU1).toHaveLength(1);
      expect(subsU1[0].userId).toBe('u1');
    });
  });

  describe('updateSubscription', () => {
    it('creates new subscription when none exists for that event', async () => {
      const sub = await updateSubscription(
        'u1',
        NotificationType.LowStock,
        [NotificationChannel.Inbox],
        true,
      );
      expect(sub.id).toBeTruthy();
      expect(sub.userId).toBe('u1');
      expect(sub.enabled).toBe(true);
      expect(sub.channels).toEqual([NotificationChannel.Inbox]);
    });

    it('updates existing subscription in place (same eventType)', async () => {
      const first = await updateSubscription(
        'u1',
        NotificationType.LowStock,
        [NotificationChannel.Inbox],
        true,
      );
      const updated = await updateSubscription(
        'u1',
        NotificationType.LowStock,
        [NotificationChannel.Email],
        false,
      );
      expect(updated.id).toBe(first.id);
      expect(updated.enabled).toBe(false);
      expect(updated.channels).toEqual([NotificationChannel.Email]);

      const subs = await getSubscriptions('u1');
      expect(subs).toHaveLength(1);
    });

    it('creates independent subscriptions for different event types', async () => {
      await updateSubscription('u1', NotificationType.LowStock, [NotificationChannel.Inbox], true);
      await updateSubscription('u1', NotificationType.WaveAssigned, [NotificationChannel.Email], true);

      const subs = await getSubscriptions('u1');
      expect(subs).toHaveLength(2);
    });
  });

  describe('isSubscribed', () => {
    it('returns true by default for unset event type', async () => {
      expect(await isSubscribed('u1', NotificationType.LowStock)).toBe(true);
    });

    it('returns enabled flag when subscription exists', async () => {
      await updateSubscription('u1', NotificationType.LowStock, [NotificationChannel.Inbox], false);
      expect(await isSubscribed('u1', NotificationType.LowStock)).toBe(false);

      await updateSubscription('u1', NotificationType.LowStock, [NotificationChannel.Inbox], true);
      expect(await isSubscribed('u1', NotificationType.LowStock)).toBe(true);
    });

    it('scopes check by user', async () => {
      await updateSubscription('u1', NotificationType.LowStock, [NotificationChannel.Inbox], false);
      // u2 has no subscription — defaults to true
      expect(await isSubscribed('u2', NotificationType.LowStock)).toBe(true);
    });
  });
});
