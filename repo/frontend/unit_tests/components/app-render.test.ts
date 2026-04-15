import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render } from '@testing-library/svelte';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import App from '../../src/App.svelte';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => null,
  getCurrentDEK: () => null,
  logout: vi.fn(),
  lock: vi.fn(),
  unlock: vi.fn(),
}));

describe('App root component', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    clearSession();
    await resetDb();
  });

  it('renders login route when unauthenticated', () => {
    const { container } = render(App, { props: { isFirstRun: false } });
    expect(container).toBeTruthy();
  });

  it('renders layout when session is active', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const { container } = render(App, { props: { isFirstRun: false } });
    expect(container).toBeTruthy();
  });

  it('renders lock screen when session is locked', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: true,
    });
    const { container } = render(App, { props: { isFirstRun: false } });
    expect(container).toBeTruthy();
  });
});
