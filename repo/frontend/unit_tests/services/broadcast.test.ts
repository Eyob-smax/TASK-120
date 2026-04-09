import { describe, it, expect } from 'vitest';
import { BroadcastSync } from '../../src/lib/services/broadcast';

describe('BroadcastSync', () => {
  it('creates without error even if BroadcastChannel is unavailable', () => {
    // jsdom does not provide BroadcastChannel
    const sync = new BroadcastSync();
    expect(sync).toBeDefined();
  });

  it('notify does not throw when BroadcastChannel is unavailable', () => {
    const sync = new BroadcastSync();
    expect(() => sync.notify('test-store', 'record-1')).not.toThrow();
  });

  it('onInvalidate does not throw when BroadcastChannel is unavailable', () => {
    const sync = new BroadcastSync();
    expect(() => sync.onInvalidate(() => {})).not.toThrow();
  });

  it('close does not throw when BroadcastChannel is unavailable', () => {
    const sync = new BroadcastSync();
    expect(() => sync.close()).not.toThrow();
  });

  it('can be closed multiple times safely', () => {
    const sync = new BroadcastSync();
    sync.close();
    sync.close();
    expect(true).toBe(true);
  });
});
