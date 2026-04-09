import { describe, it, expect } from 'vitest';
import {
  validateSubscription,
  getNextRetryDelay,
  isRetryOverdue,
  isMaxRetriesReached,
} from '../../src/lib/validators/notifications.validators';
import { NotificationType, NotificationChannel } from '../../src/lib/types/enums';

describe('Notification Validators', () => {
  describe('validateSubscription', () => {
    it('accepts a valid subscription', () => {
      const result = validateSubscription({
        userId: 'user-1',
        eventType: NotificationType.LowStock,
        channels: [NotificationChannel.Inbox],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing userId', () => {
      const result = validateSubscription({
        eventType: NotificationType.LowStock,
        channels: [NotificationChannel.Inbox],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty channels', () => {
      const result = validateSubscription({
        userId: 'user-1',
        eventType: NotificationType.LowStock,
        channels: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'empty_channels')).toBe(true);
    });

    it('rejects missing eventType', () => {
      const result = validateSubscription({
        userId: 'user-1',
        channels: [NotificationChannel.Inbox],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getNextRetryDelay', () => {
    it('returns 60000 for attempt 1 (1 minute)', () => {
      expect(getNextRetryDelay(1)).toBe(60_000);
    });

    it('returns 300000 for attempt 2 (5 minutes)', () => {
      expect(getNextRetryDelay(2)).toBe(300_000);
    });

    it('returns 900000 for attempt 3 (15 minutes)', () => {
      expect(getNextRetryDelay(3)).toBe(900_000);
    });

    it('returns null for attempt 4 (no more retries)', () => {
      expect(getNextRetryDelay(4)).toBeNull();
    });

    it('returns null for attempt 0 (invalid)', () => {
      expect(getNextRetryDelay(0)).toBeNull();
    });

    it('returns null for negative attempt', () => {
      expect(getNextRetryDelay(-1)).toBeNull();
    });
  });

  describe('isRetryOverdue', () => {
    it('returns true for scheduled time in the past', () => {
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      expect(isRetryOverdue(pastTime)).toBe(true);
    });

    it('returns false for scheduled time in the future', () => {
      const futureTime = new Date(Date.now() + 60_000).toISOString();
      expect(isRetryOverdue(futureTime)).toBe(false);
    });

    it('returns true when now equals scheduledAt', () => {
      const now = new Date('2025-01-15T10:00:00.000Z');
      expect(isRetryOverdue('2025-01-15T10:00:00.000Z', now)).toBe(true);
    });
  });

  describe('isMaxRetriesReached', () => {
    it('returns false for attempt 1-3', () => {
      expect(isMaxRetriesReached(1)).toBe(false);
      expect(isMaxRetriesReached(2)).toBe(false);
      expect(isMaxRetriesReached(3)).toBe(false);
    });

    it('returns true for attempt 4', () => {
      expect(isMaxRetriesReached(4)).toBe(true);
    });

    it('returns true for attempt 10', () => {
      expect(isMaxRetriesReached(10)).toBe(true);
    });
  });
});
