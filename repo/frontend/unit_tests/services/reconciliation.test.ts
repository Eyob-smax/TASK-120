import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import { reconcileOnStartup } from '../../src/lib/services/reconciliation';
import { ReservationRepository, FileRepository, RecycleBinRepository, QueuedAttemptRepository } from '../../src/lib/db';
import { ReservationStatus, QueuedAttemptStatus, NotificationChannel } from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS, RECYCLE_BIN_RETENTION_MS } from '../../src/lib/constants';

describe('Reconciliation on Startup', () => {
  beforeEach(async () => { await initDatabase(); await setupRealAuth(); });
  afterEach(async () => { teardownRealAuth(); await resetDb(); });

  it('handles empty state gracefully', async () => {
    const summary = await reconcileOnStartup();
    expect(summary.releasedReservations).toBe(0);
    expect(summary.purgedRecycleBin).toBe(0);
    expect(summary.processedRetries).toBe(0);
  });

  it('releases expired reservations', async () => {
    const reservationRepo = new ReservationRepository();
    const now = new Date();
    const expiredTime = new Date(now.getTime() - RESERVATION_TIMEOUT_MS - 60000).toISOString();

    await reservationRepo.add({
      id: 'res-1', orderId: 'ord-1', skuId: 'sku-1', binId: 'bin-1',
      quantity: 10, status: ReservationStatus.Active,
      lastActivityAt: expiredTime,
      createdAt: expiredTime, updatedAt: expiredTime, version: 1,
    });

    const summary = await reconcileOnStartup(now);
    expect(summary.releasedReservations).toBe(1);
  });

  it('purges expired recycle bin entries', async () => {
    const fileRepo = new FileRepository();
    const binRepo = new RecycleBinRepository();
    const now = new Date();
    const oldDate = new Date(now.getTime() - RECYCLE_BIN_RETENTION_MS - 86400000).toISOString();

    await fileRepo.add({
      id: 'f1', name: 'old.txt', mimeType: 'text/plain', size: 100,
      sha256: 'hash', currentVersionId: '', createdBy: 'u1', isDeleted: true,
      createdAt: oldDate, updatedAt: oldDate, version: 1,
    });
    await binRepo.add({
      id: 'rb-1', fileId: 'f1', originalName: 'old.txt', deletedBy: 'u1',
      deletedAt: oldDate, expiresAt: oldDate,
      createdAt: oldDate, updatedAt: oldDate, version: 1,
    });

    const summary = await reconcileOnStartup(now);
    expect(summary.purgedRecycleBin).toBe(1);
  });

  it('processes overdue notification retries', async () => {
    const attemptRepo = new QueuedAttemptRepository();
    const now = new Date();
    const pastTime = new Date(now.getTime() - 120000).toISOString();

    await attemptRepo.add({
      id: 'att-1', notificationId: 'n1', channel: NotificationChannel.Email,
      templateId: 'tmpl-1', attemptNumber: 1, scheduledAt: pastTime,
      status: QueuedAttemptStatus.Pending,
      createdAt: pastTime, updatedAt: pastTime, version: 1,
    });

    const summary = await reconcileOnStartup(now);
    expect(summary.processedRetries).toBe(1);
  });
});
