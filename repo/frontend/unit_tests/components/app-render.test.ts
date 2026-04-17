import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render } from '@testing-library/svelte';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import App from '../../src/App.svelte';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';

describe('App root component', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    clearSession();
    await resetDb();
  });

  it('renders unauthenticated state without app-layout', () => {
    const { container } = render(App, { props: { isFirstRun: false } });
    // Unauthenticated: no nav-rail or app-layout rendered
    expect(container.querySelector('.app-layout')).toBeNull();
    expect(container.querySelector('nav.nav-rail')).toBeNull();
    // Toast container wrapper is still present
    expect(container.querySelector('.toast-container')).not.toBeNull();
  });

  it('renders authenticated layout with nav rail and content area', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const { container } = render(App, { props: { isFirstRun: false } });
    expect(container.querySelector('.app-layout')).not.toBeNull();
    expect(container.querySelector('nav.nav-rail')).not.toBeNull();
    expect(container.querySelector('.app-content')).not.toBeNull();
    expect(container.querySelector('.app-topbar')).not.toBeNull();
    expect(container.querySelector('.app-main')).not.toBeNull();
  });

  it('renders lock screen overlay when session is locked', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: true,
    });
    const { container } = render(App, { props: { isFirstRun: false } });
    expect(container.querySelector('.lock-screen')).not.toBeNull();
    expect(container.querySelector('.lock-card')).not.toBeNull();
    expect(container.querySelector('.lock-card input[type="password"]')).not.toBeNull();
  });
});
