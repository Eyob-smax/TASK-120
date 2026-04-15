import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  startTask,
  completeTask,
  completeWave,
  startWave,
  planWave,
  assignTask,
} from '../../src/modules/orders/wave.service';
import { releaseReservation, cancelOrder } from '../../src/modules/orders/order.service';
import {
  resolveDiscrepancy,
  addAttachment,
  reviewDiscrepancy,
  verifyDiscrepancy,
  reportDiscrepancy,
} from '../../src/modules/orders/discrepancy.service';
import { ReleaseReason, WaveStatus, TaskStatus } from '../../src/lib/types/enums';
import { WaveRepository, TaskRepository, DiscrepancyRepository } from '../../src/lib/db';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'test-operator',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

describe('Error path coverage — not found branches', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('startTask throws when task id is missing', async () => {
    await expect(startTask('missing-task')).rejects.toThrow(/not found|not exist/i);
  });

  it('completeTask throws when task id is missing', async () => {
    await expect(completeTask('missing-task')).rejects.toThrow(/not found|not exist/i);
  });

  it('releaseReservation throws when reservation id is missing', async () => {
    await expect(
      releaseReservation('missing-res', ReleaseReason.Cancel, 'op1'),
    ).rejects.toThrow(/not found|not exist/i);
  });

  it('resolveDiscrepancy throws when id is missing', async () => {
    await expect(resolveDiscrepancy('missing-disc')).rejects.toThrow(/not found/i);
  });

  it('addAttachment throws when discrepancy id is missing', async () => {
    await expect(
      addAttachment('missing-disc', {
        id: 'a1',
        discrepancyId: 'missing-disc',
        fileId: 'f1',
        type: 'image/png',
        name: 'photo.png',
        addedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('completeWave throws when wave id is missing', async () => {
    await expect(completeWave('missing-wave')).rejects.toThrow(/not found|not exist/i);
  });

  it('completeWave throws when wave is not in_progress', async () => {
    const waveRepo = new WaveRepository();
    const now = new Date().toISOString();
    await waveRepo.add({
      id: 'w-planned',
      waveNumber: 'WAVE-X',
      status: WaveStatus.Planned,
      orderIds: [],
      lineCount: 0,
      config: { maxLinesPerWave: 25 },
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await expect(completeWave('w-planned')).rejects.toThrow(/cannot be completed|invalid_state/i);
  });

  it('completeWave throws when tasks are not all completed', async () => {
    const waveRepo = new WaveRepository();
    const taskRepo = new TaskRepository();
    const now = new Date().toISOString();
    await waveRepo.add({
      id: 'w-inprog',
      waveNumber: 'WAVE-Y',
      status: WaveStatus.InProgress,
      orderIds: [],
      lineCount: 0,
      config: { maxLinesPerWave: 25 },
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await taskRepo.add({
      id: 't-assigned',
      waveId: 'w-inprog',
      pickerId: 'p1',
      status: TaskStatus.Assigned,
      steps: [],
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await expect(completeWave('w-inprog')).rejects.toThrow(/Not all tasks completed|incomplete_tasks/i);
  });

  it('startWave throws when wave id is missing', async () => {
    await expect(startWave('missing-wave')).rejects.toThrow(/not found|not exist/i);
  });

  it('cancelOrder throws when order id is missing', async () => {
    await expect(cancelOrder('missing-order')).rejects.toThrow(/not found|not exist/i);
  });

  it('reviewDiscrepancy throws when id is missing', async () => {
    await expect(reviewDiscrepancy('missing')).rejects.toThrow(/not found/i);
  });

  it('verifyDiscrepancy throws when id is missing', async () => {
    await expect(verifyDiscrepancy('missing', 'op1')).rejects.toThrow(/not found/i);
  });

  it('addAttachment throws when discrepancy is Resolved', async () => {
    const discRepo = new DiscrepancyRepository();
    const now = new Date().toISOString();
    await discRepo.add({
      id: 'd-resolved',
      taskId: 't1',
      state: 'resolved' as any,
      reportedBy: 'u1',
      reportedAt: now,
      description: 'x',
      attachments: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await expect(
      addAttachment('d-resolved', {
        id: 'a',
        discrepancyId: 'd-resolved',
        fileId: 'f',
        type: 'image/png',
        name: 'p.png',
        addedAt: now,
      }),
    ).rejects.toThrow(/modify resolved|invalid_state/i);
  });
});
