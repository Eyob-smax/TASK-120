import { writable, derived, type Readable } from 'svelte/store';
import type { Session } from '$lib/types/auth';
import type { UserRole } from '$lib/types/enums';

export const authStore = writable<Session | null>(null);

export const isAuthenticated: Readable<boolean> = derived(
  authStore,
  ($session) => $session !== null && !$session.isLocked,
);

export const isLocked: Readable<boolean> = derived(
  authStore,
  ($session) => $session !== null && $session.isLocked,
);

export const currentRole: Readable<UserRole | null> = derived(
  authStore,
  ($session) => $session?.role ?? null,
);

export function setSession(session: Session): void {
  authStore.set(session);
}

export function clearSession(): void {
  authStore.set(null);
}

export function lockSession(): void {
  authStore.update(s => (s ? { ...s, isLocked: true } : null));
}
