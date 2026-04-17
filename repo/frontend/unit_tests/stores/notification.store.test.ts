import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  notificationStore,
  unreadCountStore,
  loadNotifications,
} from '../../src/modules/notifications/notification.store';
import { NotificationRepository } from '../../src/lib/db';
import { NotificationType } from '../../src/lib/types/enums';
import type { Notification } from '../../src/lib/types/notifications';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'u1',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

const notifRepo = new NotificationRepository();

function makeNotif(id: string, userId: string, readAt?: string): Notification {
  const now = new Date().toISOString();
  return {
    id,
    userId,
    eventType: NotificationType.LowStock,
    title: `Notif ${id}`,
    body: 'body',
    readAt,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

describe('Notification Store', () => {
  beforeEach(async () => {
    await initDatabase();
    notificationStore.set([]);
  });

  afterEach(async () => {
    notificationStore.set([]);
    await resetDb();
  });

  it('notificationStore initial value is empty array', () => {
    expect(get(notificationStore)).toEqual([]);
  });

  it('unreadCountStore derives 0 for empty store', () => {
    expect(get(unreadCountStore)).toBe(0);
  });

  it('unreadCountStore counts only notifications without readAt', () => {
    notificationStore.set([
      makeNotif('n1', 'u1'),
      makeNotif('n2', 'u1'),
      makeNotif('n3', 'u1', new Date().toISOString()),
    ]);
    expect(get(unreadCountStore)).toBe(2);
  });

  it('unreadCountStore updates when store changes', () => {
    notificationStore.set([makeNotif('n1', 'u1')]);
    expect(get(unreadCountStore)).toBe(1);
    notificationStore.update(curr => [...curr, makeNotif('n2', 'u1')]);
    expect(get(unreadCountStore)).toBe(2);
  });

  it('loadNotifications populates store from repository for a user', async () => {
    await notifRepo.add(makeNotif('n1', 'u1'));
    await notifRepo.add(makeNotif('n2', 'u1'));
    await notifRepo.add(makeNotif('n3', 'u2'));

    await loadNotifications('u1');

    const notifs = get(notificationStore);
    expect(notifs).toHaveLength(2);
    expect(notifs.every(n => n.userId === 'u1')).toBe(true);
  });

  it('loadNotifications sets empty array when user has no notifications', async () => {
    await loadNotifications('nobody');
    expect(get(notificationStore)).toEqual([]);
  });
});
