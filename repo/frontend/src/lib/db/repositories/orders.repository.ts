import { Repository } from '../repository';
import { STORE_NAMES } from '../schema';
import { ReservationStatus } from '$lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '$lib/constants';
import type { Order, Reservation, Wave, PickerTask, Discrepancy } from '$lib/types/orders';
import type { OrderStatus, WaveStatus, TaskStatus, DiscrepancyState } from '$lib/types/enums';

export class OrderRepository extends Repository<Order> {
  constructor() {
    super(STORE_NAMES.ORDERS);
  }

  async getByStatus(status: OrderStatus): Promise<Order[]> {
    return this.getByIndex('status', status);
  }

  async getByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.getOneByIndex('orderNumber', orderNumber);
  }

  async getByCreator(createdBy: string): Promise<Order[]> {
    return this.getByIndex('createdBy', createdBy);
  }
}

export class ReservationRepository extends Repository<Reservation> {
  constructor() {
    super(STORE_NAMES.RESERVATIONS);
  }

  async getByOrder(orderId: string): Promise<Reservation[]> {
    return this.getByIndex('orderId', orderId);
  }

  async getActive(): Promise<Reservation[]> {
    return this.getByIndex('status', ReservationStatus.Active);
  }

  async getByStatus(status: ReservationStatus): Promise<Reservation[]> {
    return this.getByIndex('status', status);
  }

  async getExpired(now: Date = new Date()): Promise<Reservation[]> {
    const active = await this.getActive();
    const cutoff = now.getTime() - RESERVATION_TIMEOUT_MS;
    return active.filter(r => new Date(r.lastActivityAt).getTime() < cutoff);
  }
}

export class WaveRepository extends Repository<Wave> {
  constructor() {
    super(STORE_NAMES.WAVES);
  }

  async getByStatus(status: WaveStatus): Promise<Wave[]> {
    return this.getByIndex('status', status);
  }
}

export class TaskRepository extends Repository<PickerTask> {
  constructor() {
    super(STORE_NAMES.TASKS);
  }

  async getByWave(waveId: string): Promise<PickerTask[]> {
    return this.getByIndex('waveId', waveId);
  }

  async getByPicker(pickerId: string): Promise<PickerTask[]> {
    return this.getByIndex('pickerId', pickerId);
  }

  async getByStatus(status: TaskStatus): Promise<PickerTask[]> {
    return this.getByIndex('status', status);
  }
}

export class DiscrepancyRepository extends Repository<Discrepancy> {
  constructor() {
    super(STORE_NAMES.DISCREPANCIES);
  }

  async getByTask(taskId: string): Promise<Discrepancy[]> {
    return this.getByIndex('taskId', taskId);
  }

  async getByState(state: DiscrepancyState): Promise<Discrepancy[]> {
    return this.getByIndex('state', state);
  }

  async getByReporter(reportedBy: string): Promise<Discrepancy[]> {
    return this.getByIndex('reportedBy', reportedBy);
  }
}
