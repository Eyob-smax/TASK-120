import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock each dependency to reject so the catch blocks are exercised
vi.mock('../../src/modules/orders/order.service', () => ({
  releaseExpiredReservations: vi.fn(async () => { throw new Error('res fail'); }),
}));
vi.mock('../../src/modules/files/recycle-bin.service', () => ({
  purgeExpired: vi.fn(async () => { throw new Error('purge fail'); }),
}));
vi.mock('../../src/modules/notifications/notification.service', () => ({
  processRetries: vi.fn(async () => { throw new Error('retries fail'); }),
}));

import { reconcileOnStartup } from '../../src/lib/services/reconciliation';

describe('reconcileOnStartup — catch branches', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns zeros when every dependency throws', async () => {
    const summary = await reconcileOnStartup();
    expect(summary).toEqual({
      releasedReservations: 0,
      purgedRecycleBin: 0,
      processedRetries: 0,
      scheduledNextRetries: 0,
      skippedRetries: 0,
    });
  });

  it('logs each failure via console.error', async () => {
    await reconcileOnStartup();
    expect((console.error as any).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
