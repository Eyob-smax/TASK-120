import { describe, it, expect } from 'vitest';
import {
  getNextRetryTimestamp,
  getOverdueAttempts,
  isMaxRetriesReached,
} from '../../src/modules/notifications/retry-scheduler';
import { QueuedAttemptStatus, NotificationChannel } from '../../src/lib/types/enums';
import { NOTIFICATION_RETRY_DELAYS, MAX_NOTIFICATION_RETRIES } from '../../src/lib/constants';
import type { QueuedAttempt } from '../../src/lib/types/notifications';

function makeAttempt(overrides: Partial<QueuedAttempt> = {}): QueuedAttempt {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? 'a1',
    notificationId: overrides.notificationId ?? 'n1',
    channel: overrides.channel ?? NotificationChannel.Inbox,
    templateId: overrides.templateId ?? 't1',
    attemptNumber: overrides.attemptNumber ?? 1,
    scheduledAt: overrides.scheduledAt ?? now,
    status: overrides.status ?? QueuedAttemptStatus.Pending,
    processedAt: overrides.processedAt,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    version: overrides.version ?? 1,
  };
}

describe('Retry Scheduler', () => {
  describe('getNextRetryTimestamp', () => {
    it('returns first delay for attempt 1', () => {
      const base = '2024-01-01T00:00:00.000Z';
      const ts = getNextRetryTimestamp(1, base);
      expect(ts).toBe(new Date(new Date(base).getTime() + NOTIFICATION_RETRY_DELAYS[0]).toISOString());
    });

    it('returns second delay for attempt 2', () => {
      const base = '2024-01-01T00:00:00.000Z';
      const ts = getNextRetryTimestamp(2, base);
      expect(ts).toBe(new Date(new Date(base).getTime() + NOTIFICATION_RETRY_DELAYS[1]).toISOString());
    });

    it('returns third delay for attempt 3', () => {
      const base = '2024-01-01T00:00:00.000Z';
      const ts = getNextRetryTimestamp(3, base);
      expect(ts).toBe(new Date(new Date(base).getTime() + NOTIFICATION_RETRY_DELAYS[2]).toISOString());
    });

    it('returns null when attempt exceeds delays array length', () => {
      const ts = getNextRetryTimestamp(NOTIFICATION_RETRY_DELAYS.length + 1, '2024-01-01T00:00:00.000Z');
      expect(ts).toBeNull();
    });

    it('returns null for attempt 0 (no delay index)', () => {
      expect(getNextRetryTimestamp(0, '2024-01-01T00:00:00.000Z')).toBeNull();
    });

    it('returns null for negative attempt number', () => {
      expect(getNextRetryTimestamp(-1, '2024-01-01T00:00:00.000Z')).toBeNull();
    });
  });

  describe('getOverdueAttempts', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');

    it('returns attempts with pending status and past scheduledAt', () => {
      const attempts = [
        makeAttempt({ id: 'a1', scheduledAt: '2024-06-15T11:00:00.000Z', status: QueuedAttemptStatus.Pending }),
        makeAttempt({ id: 'a2', scheduledAt: '2024-06-15T13:00:00.000Z', status: QueuedAttemptStatus.Pending }),
      ];
      const overdue = getOverdueAttempts(attempts, now);
      expect(overdue.map(a => a.id)).toEqual(['a1']);
    });

    it('excludes non-pending attempts even if past scheduledAt', () => {
      const attempts = [
        makeAttempt({ id: 'a1', scheduledAt: '2024-06-15T10:00:00.000Z', status: QueuedAttemptStatus.Simulated }),
        makeAttempt({ id: 'a2', scheduledAt: '2024-06-15T11:00:00.000Z', status: QueuedAttemptStatus.Skipped }),
      ];
      const overdue = getOverdueAttempts(attempts, now);
      expect(overdue).toEqual([]);
    });

    it('includes attempts scheduled exactly at now', () => {
      const attempts = [
        makeAttempt({ id: 'a1', scheduledAt: '2024-06-15T12:00:00.000Z', status: QueuedAttemptStatus.Pending }),
      ];
      const overdue = getOverdueAttempts(attempts, now);
      expect(overdue).toHaveLength(1);
    });

    it('defaults now to current system time when not provided', () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const attempts = [makeAttempt({ id: 'a1', scheduledAt: past, status: QueuedAttemptStatus.Pending })];
      const overdue = getOverdueAttempts(attempts);
      expect(overdue).toHaveLength(1);
    });
  });

  describe('isMaxRetriesReached', () => {
    it('returns false when attempt equals MAX_NOTIFICATION_RETRIES', () => {
      expect(isMaxRetriesReached(MAX_NOTIFICATION_RETRIES)).toBe(false);
    });

    it('returns true when attempt exceeds MAX_NOTIFICATION_RETRIES', () => {
      expect(isMaxRetriesReached(MAX_NOTIFICATION_RETRIES + 1)).toBe(true);
    });

    it('returns false for attempts 1, 2, 3', () => {
      expect(isMaxRetriesReached(1)).toBe(false);
      expect(isMaxRetriesReached(2)).toBe(false);
      expect(isMaxRetriesReached(3)).toBe(false);
    });
  });
});
