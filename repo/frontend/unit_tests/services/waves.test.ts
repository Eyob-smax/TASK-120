import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { OrderRepository, TaskRepository } from '../../src/lib/db';
import { planWave, assignTask, startWave, completeWave, startTask, completeTask } from '../../src/modules/orders/wave.service';
import {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  resolveDiscrepancy,
  canProceedToPacking,
} from '../../src/modules/orders/discrepancy.service';
import { OrderStatus, WaveStatus, TaskStatus, DiscrepancyState } from '../../src/lib/types/enums';
import type { Order } from '../../src/lib/types/orders';

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

const orderRepo = new OrderRepository();
const taskRepo = new TaskRepository();

async function seedOrder(lineCount: number): Promise<Order> {
  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: `ORD-${Date.now()}`,
    status: OrderStatus.Reserved,
    lines: Array.from({ length: lineCount }, (_, i) => ({
      id: `line-${i}`,
      orderId: '',
      skuId: `sku-${i}`,
      binId: `bin-${i}`,
      quantity: 5,
    })),
    createdBy: 'test-operator',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await orderRepo.add(order);
  return order;
}

describe('Wave Service', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe('planWave', () => {
    it('creates wave with correct line count', async () => {
      const order = await seedOrder(10);
      const wave = await planWave([order.id]);

      expect(wave.status).toBe(WaveStatus.Planned);
      expect(wave.lineCount).toBe(10);
      expect(wave.orderIds).toContain(order.id);
    });

    it('respects 25-line default limit', async () => {
      const order = await seedOrder(30);
      await expect(planWave([order.id])).rejects.toThrow('exceeds');
    });

    it('allows custom line limit', async () => {
      const order = await seedOrder(30);
      const wave = await planWave([order.id], { maxLinesPerWave: 50 });
      expect(wave.lineCount).toBe(30);
    });

    it('rejects non-existent order', async () => {
      await expect(planWave(['nonexistent'])).rejects.toThrow('not found');
    });
  });

  describe('assignTask', () => {
    it('creates task with sorted pick path steps', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin',
        zonePriority: ['A', 'B'],
      });

      expect(task.pickerId).toBe('picker-1');
      expect(task.status).toBe(TaskStatus.Assigned);
      expect(task.steps.length).toBe(5);
      // Steps should have sequence numbers
      expect(task.steps[0].sequence).toBe(1);
    });
  });

  describe('wave lifecycle', () => {
    it('starts a planned wave', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      const started = await startWave(wave.id);

      expect(started.status).toBe(WaveStatus.InProgress);
      expect(started.startedAt).toBeTruthy();
    });

    it('rejects starting non-planned wave', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      await expect(startWave(wave.id)).rejects.toThrow();
    });

    it('completes wave when all tasks complete', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);

      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });
      await startTask(task.id);
      await completeTask(task.id);

      const completed = await completeWave(wave.id);
      expect(completed.status).toBe(WaveStatus.Completed);
    });

    it('rejects completion with incomplete tasks', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      await expect(completeWave(wave.id)).rejects.toThrow('tasks');
    });
  });
});

describe('Discrepancy Service', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe('state machine', () => {
    it('transitions: opened → under_review → verified → resolved', async () => {
      const d1 = await reportDiscrepancy('task-1', 'user-1', 'Missing item');
      expect(d1.state).toBe(DiscrepancyState.Opened);

      const d2 = await reviewDiscrepancy(d1.id, 'Checking');
      expect(d2.state).toBe(DiscrepancyState.UnderReview);

      const d3 = await verifyDiscrepancy(d2.id, 'verifier-1', 'Confirmed shortage');
      expect(d3.state).toBe(DiscrepancyState.Verified);
      expect(d3.verifiedBy).toBe('verifier-1');

      const d4 = await resolveDiscrepancy(d3.id);
      expect(d4.state).toBe(DiscrepancyState.Resolved);
      expect(d4.resolvedAt).toBeTruthy();
    });

    it('rejects invalid transition: opened → verified', async () => {
      const d = await reportDiscrepancy('task-1', 'user-1', 'Issue');
      await expect(verifyDiscrepancy(d.id, 'v1', 'notes')).rejects.toThrow('transition');
    });

    it('rejects invalid transition: opened → resolved', async () => {
      const d = await reportDiscrepancy('task-1', 'user-1', 'Issue');
      await expect(resolveDiscrepancy(d.id)).rejects.toThrow('transition');
    });

    it('rejects transition from resolved', async () => {
      const d1 = await reportDiscrepancy('task-1', 'user-1', 'Issue');
      const d2 = await reviewDiscrepancy(d1.id);
      const d3 = await verifyDiscrepancy(d2.id, 'v1', 'ok');
      const d4 = await resolveDiscrepancy(d3.id);
      await expect(reviewDiscrepancy(d4.id)).rejects.toThrow('transition');
    });
  });

  describe('task lifecycle', () => {
    it('starts an assigned task', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      const started = await startTask(task.id);
      expect(started.status).toBe(TaskStatus.InProgress);
      expect(started.startedAt).toBeTruthy();
    });

    it('completes an in-progress task', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      await startTask(task.id);
      const completed = await completeTask(task.id);
      expect(completed.status).toBe(TaskStatus.Completed);
      expect(completed.completedAt).toBeTruthy();
    });

    it('rejects starting a non-assigned task', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      await startTask(task.id);
      await expect(startTask(task.id)).rejects.toThrow('transition');
    });

    it('rejects completing an assigned task (must start first)', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      await expect(completeTask(task.id)).rejects.toThrow('transition');
    });

    it('rejects completion with unverified discrepancies', async () => {
      const order = await seedOrder(5);
      const wave = await planWave([order.id]);
      await startWave(wave.id);
      const task = await assignTask(wave.id, 'picker-1', {
        sortBy: 'zone_then_bin', zonePriority: [],
      });

      await startTask(task.id);
      await reportDiscrepancy(task.id, 'picker-1', 'Missing item');
      await expect(completeTask(task.id)).rejects.toThrow('Cannot complete');
    });
  });

  describe('canProceedToPacking', () => {
    it('returns true when no discrepancies exist', async () => {
      const result = await canProceedToPacking('task-no-issues');
      expect(result).toBe(true);
    });

    it('returns false with open discrepancies', async () => {
      await reportDiscrepancy('task-1', 'user-1', 'Problem');
      const result = await canProceedToPacking('task-1');
      expect(result).toBe(false);
    });

    it('returns false with under_review discrepancies', async () => {
      const d = await reportDiscrepancy('task-1', 'user-1', 'Problem');
      await reviewDiscrepancy(d.id);
      const result = await canProceedToPacking('task-1');
      expect(result).toBe(false);
    });

    it('returns true when all discrepancies are verified or resolved', async () => {
      const d1 = await reportDiscrepancy('task-1', 'user-1', 'Problem 1');
      const d2 = await reportDiscrepancy('task-1', 'user-1', 'Problem 2');

      const d1r = await reviewDiscrepancy(d1.id);
      await verifyDiscrepancy(d1r.id, 'v1', 'ok');

      const d2r = await reviewDiscrepancy(d2.id);
      const d2v = await verifyDiscrepancy(d2r.id, 'v1', 'ok');
      await resolveDiscrepancy(d2v.id);

      const result = await canProceedToPacking('task-1');
      expect(result).toBe(true);
    });
  });
});
