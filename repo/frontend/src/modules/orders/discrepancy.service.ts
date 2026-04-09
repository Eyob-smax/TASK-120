import { DiscrepancyRepository } from '$lib/db';
import { ValidationServiceError } from '$lib/services/errors';
import { createLogger } from '$lib/logging';
import { DiscrepancyState, NotificationType } from '$lib/types/enums';
import { dispatchNotification } from '$modules/notifications/notification.service';
import { getCurrentSession } from '$lib/security/auth.service';
import type { Discrepancy, DiscrepancyAttachment } from '$lib/types/orders';

const discrepancyRepo = new DiscrepancyRepository();
const logger = createLogger('inventory');

const VALID_TRANSITIONS: Record<DiscrepancyState, DiscrepancyState[]> = {
  [DiscrepancyState.Opened]: [DiscrepancyState.UnderReview],
  [DiscrepancyState.UnderReview]: [DiscrepancyState.Verified],
  [DiscrepancyState.Verified]: [DiscrepancyState.Resolved],
  [DiscrepancyState.Resolved]: [],
};

function assertTransition(current: DiscrepancyState, target: DiscrepancyState): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new ValidationServiceError('Invalid state transition', [
      {
        field: 'state',
        message: `Cannot transition from ${current} to ${target}`,
        code: 'invalid_transition',
      },
    ]);
  }
}

export async function reportDiscrepancy(
  taskId: string,
  reportedBy: string,
  description: string,
  attachments: DiscrepancyAttachment[] = [],
  orderId?: string,
): Promise<Discrepancy> {
  if (!description.trim()) {
    throw new ValidationServiceError('Description required', [
      { field: 'description', message: 'Description is required', code: 'required' },
    ]);
  }

  const now = new Date().toISOString();
  const discrepancy: Discrepancy = {
    id: crypto.randomUUID(),
    taskId,
    orderId,
    state: DiscrepancyState.Opened,
    reportedBy,
    reportedAt: now,
    description,
    attachments,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await discrepancyRepo.add(discrepancy);
  logger.info('Discrepancy reported', { discrepancyId: discrepancy.id, taskId });

  try {
    const userId = getCurrentSession()?.userId ?? 'system';
    await dispatchNotification(userId, NotificationType.DiscrepancyOpened, 'Discrepancy Reported',
      `Discrepancy on task ${taskId}: ${description}`, { taskId, discrepancyId: discrepancy.id });
  } catch { /* notification failure should not block discrepancy reporting */ }

  return discrepancy;
}

export async function reviewDiscrepancy(
  discrepancyId: string,
  notes?: string,
): Promise<Discrepancy> {
  const d = await discrepancyRepo.getById(discrepancyId);
  if (!d) throw new ValidationServiceError('Discrepancy not found', [
    { field: 'discrepancyId', message: 'Not found', code: 'not_found' },
  ]);

  assertTransition(d.state, DiscrepancyState.UnderReview);

  return discrepancyRepo.put({
    ...d,
    state: DiscrepancyState.UnderReview,
    verificationNotes: notes ?? d.verificationNotes,
    updatedAt: new Date().toISOString(),
  });
}

export async function verifyDiscrepancy(
  discrepancyId: string,
  verifiedBy: string,
  notes: string,
  attachments: DiscrepancyAttachment[] = [],
): Promise<Discrepancy> {
  const d = await discrepancyRepo.getById(discrepancyId);
  if (!d) throw new ValidationServiceError('Discrepancy not found', [
    { field: 'discrepancyId', message: 'Not found', code: 'not_found' },
  ]);

  assertTransition(d.state, DiscrepancyState.Verified);

  if (!verifiedBy) {
    throw new ValidationServiceError('Verifier required', [
      { field: 'verifiedBy', message: 'Verifier identity is required', code: 'required' },
    ]);
  }

  const now = new Date().toISOString();
  return discrepancyRepo.put({
    ...d,
    state: DiscrepancyState.Verified,
    verifiedBy,
    verifiedAt: now,
    verificationNotes: notes,
    attachments: [...d.attachments, ...attachments],
    updatedAt: now,
  });
}

export async function resolveDiscrepancy(discrepancyId: string): Promise<Discrepancy> {
  const d = await discrepancyRepo.getById(discrepancyId);
  if (!d) throw new ValidationServiceError('Discrepancy not found', [
    { field: 'discrepancyId', message: 'Not found', code: 'not_found' },
  ]);

  assertTransition(d.state, DiscrepancyState.Resolved);

  const now = new Date().toISOString();
  const resolved = await discrepancyRepo.put({
    ...d,
    state: DiscrepancyState.Resolved,
    resolvedAt: now,
    updatedAt: now,
  });

  try {
    const userId = getCurrentSession()?.userId ?? 'system';
    await dispatchNotification(userId, NotificationType.DiscrepancyClosed, 'Discrepancy Resolved',
      `Discrepancy for task ${d.taskId} has been resolved`, { taskId: d.taskId, discrepancyId: d.id });
  } catch { /* notification failure should not block resolution */ }

  return resolved;
}

export async function canProceedToPacking(taskId: string): Promise<boolean> {
  const discrepancies = await discrepancyRepo.getByTask(taskId);
  if (discrepancies.length === 0) return true;

  return discrepancies.every(
    d => d.state === DiscrepancyState.Verified || d.state === DiscrepancyState.Resolved,
  );
}

export async function addAttachment(
  discrepancyId: string,
  attachment: DiscrepancyAttachment,
): Promise<Discrepancy> {
  const d = await discrepancyRepo.getById(discrepancyId);
  if (!d) throw new ValidationServiceError('Discrepancy not found', [
    { field: 'discrepancyId', message: 'Not found', code: 'not_found' },
  ]);

  if (d.state === DiscrepancyState.Resolved) {
    throw new ValidationServiceError('Cannot modify resolved discrepancy', [
      { field: 'state', message: 'Discrepancy is resolved', code: 'invalid_state' },
    ]);
  }

  return discrepancyRepo.put({
    ...d,
    attachments: [...d.attachments, attachment],
    updatedAt: new Date().toISOString(),
  });
}

export async function getDiscrepanciesByTask(taskId: string): Promise<Discrepancy[]> {
  return discrepancyRepo.getByTask(taskId);
}
