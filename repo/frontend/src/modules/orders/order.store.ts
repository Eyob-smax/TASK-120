import { writable } from 'svelte/store';
import { OrderRepository, ReservationRepository, WaveRepository, TaskRepository } from '$lib/db';
import type { Order, Reservation, Wave, PickerTask } from '$lib/types/orders';

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
