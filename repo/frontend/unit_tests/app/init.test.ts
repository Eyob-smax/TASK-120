import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('../../src/lib/security/auth.service', () => ({
  bootstrap: vi.fn(async () => ({ isFirstRun: false })),
  getCurrentSession: () => null,
  getCurrentDEK: () => null,
}));

vi.mock('../../src/lib/services/reconciliation', () => ({
  reconcileOnStartup: vi.fn(async () => ({
    releasedReservations: 0,
    purgedRecycleBinEntries: 0,
    retriedAttempts: 0,
  })),
}));

vi.mock('../../src/lib/services/broadcast', () => ({
  BroadcastSync: class {
    notify() {}
    onInvalidate() {}
    close() {}
  },
}));

import { initApp, getBroadcastSync } from '../../src/app/init';
import { resetDb } from '../../src/lib/db/connection';
import { appStore } from '../../src/lib/stores/app.store';
import { get } from 'svelte/store';
import { bootstrap } from '../../src/lib/security/auth.service';
import { reconcileOnStartup } from '../../src/lib/services/reconciliation';

describe('App Init', () => {
  beforeEach(() => {
    appStore.set({
      loading: false,
      error: null,
      sidebarCollapsed: false,
      initialized: false,
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('initApp completes and returns isFirstRun=false by default', async () => {
    const result = await initApp();
    expect(result.isFirstRun).toBe(false);
  });

  it('initApp calls bootstrap()', async () => {
    await initApp();
    expect(bootstrap).toHaveBeenCalled();
  });

  it('initApp calls reconcileOnStartup when not first run', async () => {
    await initApp();
    expect(reconcileOnStartup).toHaveBeenCalled();
  });

  it('initApp skips reconciliation on first run', async () => {
    (bootstrap as any).mockResolvedValueOnce({ isFirstRun: true });
    await initApp();
    expect(reconcileOnStartup).not.toHaveBeenCalled();
  });

  it('initApp marks app as initialized after successful bootstrap', async () => {
    await initApp();
    expect(get(appStore).initialized).toBe(true);
  });

  it('initApp sets error on failure and re-throws', async () => {
    (bootstrap as any).mockRejectedValueOnce(new Error('boom'));
    await expect(initApp()).rejects.toThrow(/boom/);
    expect(get(appStore).error).toMatch(/boom/i);
  });

  it('initApp sets error to fallback string when non-Error thrown', async () => {
    (bootstrap as any).mockRejectedValueOnce('not-an-error-object');
    await expect(initApp()).rejects.toBeTruthy();
    expect(get(appStore).error).toBeTruthy();
  });

  it('getBroadcastSync returns a BroadcastSync instance after initApp', async () => {
    await initApp();
    expect(getBroadcastSync()).not.toBeNull();
  });
});
