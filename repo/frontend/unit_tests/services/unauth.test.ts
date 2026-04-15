import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => null,
  getCurrentDEK: () => null,
}));

import { planWave } from '../../src/modules/orders/wave.service';
import { createOrder } from '../../src/modules/orders/order.service';

describe('Services — unauthenticated branches', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('planWave rejects when no session', async () => {
    await expect(planWave([])).rejects.toThrow(/authenticated|logged in/i);
  });

  it('createOrder rejects when no session', async () => {
    await expect(
      createOrder({
        lines: [{ id: 'l', orderId: '', skuId: 's', binId: 'b', quantity: 1 }],
      }),
    ).rejects.toThrow(/authenticated|logged in|session/i);
  });
});
