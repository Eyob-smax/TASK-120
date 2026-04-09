import type { QueuedAttempt } from '$lib/types/notifications';
import { QueuedAttemptStatus } from '$lib/types/enums';
import { NOTIFICATION_RETRY_DELAYS, MAX_NOTIFICATION_RETRIES } from '$lib/constants';

/**
 * Returns the ISO timestamp for the next retry, or null if no retries remain.
 *
 * Attempt numbering is 1-based:
 *   attempt 1 = initial send
 *   attempt 2 = retry #1 (delay = NOTIFICATION_RETRY_DELAYS[0] = 1 min)
 *   attempt 3 = retry #2 (delay = NOTIFICATION_RETRY_DELAYS[1] = 5 min)
 *   attempt 4 = retry #3 (delay = NOTIFICATION_RETRY_DELAYS[2] = 15 min)
 *
 * When currentAttemptNumber exceeds the delays array length the function
 * returns null, which naturally caps the total number of retries.
 */
export function getNextRetryTimestamp(
  currentAttemptNumber: number,
  processedAt: string,
): string | null {
  const delayIndex = currentAttemptNumber - 1;
  if (delayIndex < 0 || delayIndex >= NOTIFICATION_RETRY_DELAYS.length) {
    return null;
  }
  const delayMs = NOTIFICATION_RETRY_DELAYS[delayIndex];
  return new Date(new Date(processedAt).getTime() + delayMs).toISOString();
}

export function getOverdueAttempts(
  attempts: QueuedAttempt[],
  now: Date = new Date(),
): QueuedAttempt[] {
  return attempts.filter(
    a =>
      a.status === QueuedAttemptStatus.Pending &&
      new Date(a.scheduledAt).getTime() <= now.getTime(),
  );
}

/**
 * Returns true when no further retries should be scheduled.
 * attemptNumber is 1-based (1 = initial send, 2+ = retries).
 * With MAX_NOTIFICATION_RETRIES = 3, retries are exhausted once
 * attemptNumber > MAX_NOTIFICATION_RETRIES (i.e. attempt 4 is the last
 * retry and attempt 5 would exceed the cap).
 */
export function isMaxRetriesReached(attemptNumber: number): boolean {
  return attemptNumber > MAX_NOTIFICATION_RETRIES;
}
