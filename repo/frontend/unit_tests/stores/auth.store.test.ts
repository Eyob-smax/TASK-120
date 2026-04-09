import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  authStore,
  isAuthenticated,
  isLocked,
  currentRole,
  setSession,
  clearSession,
  lockSession,
} from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';
import type { Session } from '../../src/lib/types/auth';

const testSession: Session = {
  userId: 'user-1',
  role: UserRole.Administrator,
  loginAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  isLocked: false,
};

describe('Auth Store', () => {
  afterEach(() => {
    clearSession();
  });

  it('initial value is null', () => {
    expect(get(authStore)).toBeNull();
  });

  it('setSession sets the session', () => {
    setSession(testSession);
    expect(get(authStore)).toEqual(testSession);
  });

  it('clearSession resets to null', () => {
    setSession(testSession);
    clearSession();
    expect(get(authStore)).toBeNull();
  });

  it('lockSession sets isLocked on current session', () => {
    setSession(testSession);
    lockSession();
    expect(get(authStore)?.isLocked).toBe(true);
  });

  it('lockSession on null session stays null', () => {
    lockSession();
    expect(get(authStore)).toBeNull();
  });

  it('isAuthenticated is true when session exists and not locked', () => {
    setSession(testSession);
    expect(get(isAuthenticated)).toBe(true);
  });

  it('isAuthenticated is false when locked', () => {
    setSession(testSession);
    lockSession();
    expect(get(isAuthenticated)).toBe(false);
  });

  it('isAuthenticated is false when no session', () => {
    expect(get(isAuthenticated)).toBe(false);
  });

  it('isLocked is true when session is locked', () => {
    setSession(testSession);
    lockSession();
    expect(get(isLocked)).toBe(true);
  });

  it('isLocked is false when no session', () => {
    expect(get(isLocked)).toBe(false);
  });

  it('currentRole returns the session role', () => {
    setSession(testSession);
    expect(get(currentRole)).toBe(UserRole.Administrator);
  });

  it('currentRole returns null when no session', () => {
    expect(get(currentRole)).toBeNull();
  });
});
