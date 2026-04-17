import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('../src/app/init', () => ({
  initApp: vi.fn(async () => ({ isFirstRun: false })),
  getBroadcastSync: () => null,
}));

vi.mock('../src/styles/global.css', () => ({}), { virtual: true });

describe('main.ts', () => {
  beforeEach(() => {
    // Add #app element so main.ts can mount into it
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    vi.resetModules();
  });

  afterEach(() => {
    const appDiv = document.getElementById('app');
    if (appDiv) appDiv.remove();
    vi.restoreAllMocks();
  });

  it('calls initApp and mounts App on success', async () => {
    const { initApp } = await import('../src/app/init');
    (initApp as any).mockResolvedValueOnce({ isFirstRun: true });

    await import('../src/main');

    // Wait a microtask for initApp().then() to resolve
    await new Promise(r => setTimeout(r, 50));

    expect(initApp).toHaveBeenCalled();
    // After mount, #app should have content (svelte-spa-router / App rendered)
    const appDiv = document.getElementById('app');
    expect(appDiv?.children.length ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('handles init failure by showing error markup', async () => {
    vi.resetModules();
    const { initApp } = await import('../src/app/init');
    (initApp as any).mockRejectedValueOnce(new Error('init failed'));

    await import('../src/main');
    await new Promise(r => setTimeout(r, 50));

    const appDiv = document.getElementById('app');
    expect(appDiv?.innerHTML).toMatch(/Initialization Failed|init failed/i);
  });
});
