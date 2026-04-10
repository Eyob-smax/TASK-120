import { writable, get } from 'svelte/store';
import { OrderRepository, ReservationRepository, WaveRepository, TaskRepository } from '$lib/db';
import type { Order, Reservation, Wave, PickerTask, OrderLine } from '$lib/types/orders';
import { createOptimisticUpdate } from '$lib/services';
import { OrderStatus } from '$lib/types/enums';
import {
  createOrder as _createOrder,
  cancelOrder as _cancelOrder,
} from './order.service';

const orderRepo = new OrderRepository();
const reservationRepo = new ReservationRepository();
const waveRepo = new WaveRepository();
const taskRepo = new TaskRepository();

export const orderStore = writable<Order[]>([]);
export const reservationStore = writable<Reservation[]>([]);
export const waveStore = writable<Wave[]>([]);
export const taskStore = writable<PickerTask[]>([]);

export async function loadOrders(): Promise<void> {
  orderStore.set(await orderRepo.getAll());
}

export async function loadReservations(): Promise<void> {
  reservationStore.set(await reservationRepo.getAll());
}

export async function loadWaves(): Promise<void> {
  waveStore.set(await waveRepo.getAll());
}

export async function loadTasks(pickerId?: string): Promise<void> {
  const tasks = pickerId
    ? await taskRepo.getByPicker(pickerId)
    : await taskRepo.getAll();
  taskStore.set(tasks);
}

export async function optimisticCreateOrder(
  orderData: Partial<Order> & { lines: OrderLine[] },
) {
  const current = get(orderStore);
  const now = new Date().toISOString();
  const placeholder: Order = {
    id: 'pending-' + Date.now(),
    orderNumber: orderData.orderNumber ?? `ORD-${Date.now()}`,
    status: OrderStatus.Confirmed,
    lines: orderData.lines,
    createdBy: 'pending',
    notes: orderData.notes,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  return createOptimisticUpdate(orderStore, [...current, placeholder], async () => {
    await _createOrder(orderData);
    orderStore.set(await orderRepo.getAll());
  });
}

export async function optimisticCancelOrder(orderId: string) {
  const current = get(orderStore);
  const optimistic = current.map(o =>
    o.id === orderId ? { ...o, status: OrderStatus.Cancelled } : o,
  );

  return createOptimisticUpdate(orderStore, optimistic, async () => {
    await _cancelOrder(orderId);
    orderStore.set(await orderRepo.getAll());
  });
}
