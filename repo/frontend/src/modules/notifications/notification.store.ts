import { writable, derived } from 'svelte/store';
import type { Notification } from '$lib/types/notifications';
import { getInbox } from './notification.service';

export const notificationStore = writable<Notification[]>([]);

export const unreadCountStore = derived(notificationStore, ($notifs) =>
  $notifs.filter(n => !n.readAt).length,
);

export async function loadNotifications(userId: string): Promise<void> {
  const notifs = await getInbox(userId);
  notificationStore.set(notifs);
}
