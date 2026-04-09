import { OrderRepository, WaveRepository, TaskRepository, BinRepository } from '$lib/db';
import { validateWaveConfig } from '$lib/validators';
import { ValidationServiceError } from '$lib/services/errors';
import { getCurrentSession } from '$lib/security/auth.service';
import { createLogger } from '$lib/logging';
import { sortPickPath } from './pick-path';
import { WAVE_DEFAULT_SIZE } from '$lib/constants';
import { OrderStatus, WaveStatus, TaskStatus, NotificationType } from '$lib/types/enums';
import { canProceedToPacking } from './discrepancy.service';
import { dispatchNotification } from '$modules/notifications/notification.service';
import type { Order, Wave, WaveConfig, PickerTask, PickPathStep, PickPathConfig } from '$lib/types/orders';

const orderRepo = new OrderRepository();
const waveRepo = new WaveRepository();
const taskRepo = new TaskRepository();
const binRepo = new BinRepository();
const logger = createLogger('inventory');

const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Assigned]: [TaskStatus.InProgress, TaskStatus.Blocked],
  [TaskStatus.InProgress]: [TaskStatus.Completed, TaskStatus.Blocked],
  [TaskStatus.Completed]: [],
  [TaskStatus.Blocked]: [TaskStatus.Assigned],
};

function assertTaskTransition(current: TaskStatus, target: TaskStatus): void {
  const allowed = VALID_TASK_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new ValidationServiceError('Invalid task state transition', [
      {
        field: 'status',
        message: `Cannot transition task from ${current} to ${target}`,
        code: 'invalid_task_transition',
      },
    ]);
  }
}

export async function planWave(
  orderIds: string[],
  config?: Partial<WaveConfig>,
): Promise<Wave> {
  if (!getCurrentSession()) {
    throw new ValidationServiceError('Not authenticated', [
      { field: 'session', message: 'User must be logged in', code: 'unauthenticated' },
    ]);
  }

  const waveConfig: WaveConfig = {
    maxLinesPerWave: config?.maxLinesPerWave ?? WAVE_DEFAULT_SIZE,
    priorityRules: config?.priorityRules,
  };

  const validation = validateWaveConfig(waveConfig);
  if (!validation.valid) throw new ValidationServiceError('Invalid wave config', validation.errors);

  const orders: Order[] = [];
  let totalLines = 0;

  for (const orderId of orderIds) {
    const order = await orderRepo.getById(orderId);
    if (!order) {
      throw new ValidationServiceError('Order not found', [
        { field: 'orderIds', message: `Order ${orderId} not found`, code: 'not_found' },
      ]);
    }
    totalLines += order.lines.length;
    orders.push(order);
  }

  if (totalLines > waveConfig.maxLinesPerWave) {
    throw new ValidationServiceError('Wave exceeds line limit', [
      {
        field: 'lines',
        message: `Total lines ${totalLines} exceeds max ${waveConfig.maxLinesPerWave}`,
        code: 'exceeds_wave_size',
      },
    ]);
  }

  const now = new Date().toISOString();
  const wave: Wave = {
    id: crypto.randomUUID(),
    waveNumber: `WAVE-${Date.now()}`,
    status: WaveStatus.Planned,
    orderIds,
    lineCount: totalLines,
    config: waveConfig,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await waveRepo.add(wave);
  logger.info('Wave planned', { waveId: wave.id, orderCount: orderIds.length, totalLines });
  return wave;
}

export async function assignTask(
  waveId: string,
  pickerId: string,
  pickPathConfig: PickPathConfig,
): Promise<PickerTask> {
  const wave = await waveRepo.getById(waveId);
  if (!wave) {
    throw new ValidationServiceError('Wave not found', [
      { field: 'waveId', message: 'Wave does not exist', code: 'not_found' },
    ]);
  }

  const steps: PickPathStep[] = [];
  for (const orderId of wave.orderIds) {
    const order = await orderRepo.getById(orderId);
    if (!order) continue;
    for (const line of order.lines) {
      if (line.binId) {
        // Look up real bin metadata for zone and code
        const bin = await binRepo.getById(line.binId);
        steps.push({
          binId: line.binId,
          zone: bin?.zone ?? '',
          binCode: bin?.code ?? line.binId,
          skuId: line.skuId,
          quantity: line.quantity,
          sequence: 0,
        });
      }
    }
  }

  const sortedSteps = sortPickPath(steps, pickPathConfig);

  const now = new Date().toISOString();
  const task: PickerTask = {
    id: crypto.randomUUID(),
    waveId,
    pickerId,
    status: TaskStatus.Assigned,
    steps: sortedSteps,
    assignedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await taskRepo.add(task);
  logger.info('Task assigned', { taskId: task.id, waveId, pickerId, stepCount: sortedSteps.length });

  try {
    await dispatchNotification(pickerId, NotificationType.WaveAssigned, 'Wave Assigned',
      `You have been assigned to wave ${wave.waveNumber} with ${sortedSteps.length} pick steps`,
      { waveId, waveNumber: wave.waveNumber, stepCount: sortedSteps.length });
  } catch { /* notification failure should not block task assignment */ }

  return task;
}

export async function startWave(waveId: string): Promise<Wave> {
  const wave = await waveRepo.getById(waveId);
  if (!wave) throw new ValidationServiceError('Wave not found', [
    { field: 'waveId', message: 'Wave does not exist', code: 'not_found' },
  ]);

  if (wave.status !== WaveStatus.Planned) {
    throw new ValidationServiceError('Wave cannot be started', [
      { field: 'status', message: `Wave is ${wave.status}, must be planned`, code: 'invalid_state' },
    ]);
  }

  return waveRepo.put({
    ...wave,
    status: WaveStatus.InProgress,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function completeWave(waveId: string): Promise<Wave> {
  const wave = await waveRepo.getById(waveId);
  if (!wave) throw new ValidationServiceError('Wave not found', [
    { field: 'waveId', message: 'Wave does not exist', code: 'not_found' },
  ]);

  if (wave.status !== WaveStatus.InProgress) {
    throw new ValidationServiceError('Wave cannot be completed', [
      { field: 'status', message: `Wave is ${wave.status}, must be in_progress`, code: 'invalid_state' },
    ]);
  }

  const tasks = await taskRepo.getByWave(waveId);
  const allComplete = tasks.every(t => t.status === TaskStatus.Completed);
  if (!allComplete) {
    throw new ValidationServiceError('Not all tasks completed', [
      { field: 'tasks', message: 'All tasks must be completed before wave completion', code: 'incomplete_tasks' },
    ]);
  }

  return waveRepo.put({
    ...wave,
    status: WaveStatus.Completed,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function startTask(taskId: string): Promise<PickerTask> {
  const task = await taskRepo.getById(taskId);
  if (!task) {
    throw new ValidationServiceError('Task not found', [
      { field: 'taskId', message: 'Task does not exist', code: 'not_found' },
    ]);
  }

  assertTaskTransition(task.status, TaskStatus.InProgress);

  const now = new Date().toISOString();
  const updated = await taskRepo.put({
    ...task,
    status: TaskStatus.InProgress,
    startedAt: now,
    updatedAt: now,
  });

  logger.info('Task started', { taskId, waveId: task.waveId, pickerId: task.pickerId });
  return updated;
}

export async function completeTask(taskId: string): Promise<PickerTask> {
  const task = await taskRepo.getById(taskId);
  if (!task) {
    throw new ValidationServiceError('Task not found', [
      { field: 'taskId', message: 'Task does not exist', code: 'not_found' },
    ]);
  }

  assertTaskTransition(task.status, TaskStatus.Completed);

  const canPack = await canProceedToPacking(taskId);
  if (!canPack) {
    throw new ValidationServiceError('Cannot complete task', [
      {
        field: 'discrepancies',
        message: 'All discrepancies must be verified or resolved before task completion',
        code: 'unresolved_discrepancies',
      },
    ]);
  }

  const now = new Date().toISOString();
  const updated = await taskRepo.put({
    ...task,
    status: TaskStatus.Completed,
    completedAt: now,
    updatedAt: now,
  });

  logger.info('Task completed', { taskId, waveId: task.waveId, pickerId: task.pickerId });
  return updated;
}
