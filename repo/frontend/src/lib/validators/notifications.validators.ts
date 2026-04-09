import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { Subscription } from '$lib/types/notifications';
import { NOTIFICATION_RETRY_DELAYS, MAX_NOTIFICATION_RETRIES } from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateSubscription(sub: Partial<Subscription>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!sub.userId) {
    errors.push(err('userId', 'User ID is required', 'required'));
  }
  if (!sub.eventType) {
    errors.push(err('eventType', 'Event type is required', 'required'));
  }
  if (!sub.channels || sub.channels.length === 0) {
    errors.push(err('channels', 'At least one channel is required', 'empty_channels'));
  }

  return makeResult(errors);
}

export function getNextRetryDelay(attemptNumber: number): number | null {
  const index = attemptNumber - 1;
  if (index < 0 || index >= NOTIFICATION_RETRY_DELAYS.length) {
    return null;
  }
  return NOTIFICATION_RETRY_DELAYS[index];
}

export function isRetryOverdue(scheduledAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(scheduledAt).getTime();
}

export function isMaxRetriesReached(attemptNumber: number): boolean {
  return attemptNumber > MAX_NOTIFICATION_RETRIES;
}
