import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync } from '../../src/lib/services/broadcast';

class FakeBroadcastChannel {
  public name: string;
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public closed = false;
  public sent: unknown[] = [];
  private static instances: FakeBroadcastChannel[] = [];

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    this.sent.push(data);
    // Deliver to *other* instances on the same channel
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && other.name === this.name && !other.closed && other.onmessage) {
        other.onmessage({ data } as MessageEvent);
      }
    }
  }

  close() {
    this.closed = true;
  }

  static reset() {
    FakeBroadcastChannel.instances = [];
  }
}

describe('BroadcastSync with BroadcastChannel available', () => {
  beforeEach(() => {
    FakeBroadcastChannel.reset();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    FakeBroadcastChannel.reset();
  });

  it('constructor creates a BroadcastChannel instance when available', () => {
    new BroadcastSync();
    // One instance registered
    expect((FakeBroadcastChannel as any).instances?.length ?? 1).toBeGreaterThanOrEqual(1);
  });

  it('notify posts an invalidate message', () => {
    const a = new BroadcastSync();
    const b = new BroadcastSync();

    const received: Array<{ store: string; recordId?: string }> = [];
    b.onInvalidate((store, recordId) => {
      received.push({ store, recordId });
    });

    a.notify('stock', 'rec-1');
    expect(received).toEqual([{ store: 'stock', recordId: 'rec-1' }]);
  });

  it('notify without recordId posts with undefined recordId', () => {
    const a = new BroadcastSync();
    const b = new BroadcastSync();

    const received: Array<{ store: string; recordId?: string }> = [];
    b.onInvalidate((store, recordId) => {
      received.push({ store, recordId });
    });

    a.notify('orders');
    expect(received[0].store).toBe('orders');
    expect(received[0].recordId).toBeUndefined();
  });

  it('onInvalidate ignores messages of other types', () => {
    const a = new BroadcastSync();

    let fired = false;
    a.onInvalidate(() => { fired = true; });

    // Simulate a message of different type delivered directly via the channel
    const instance = (FakeBroadcastChannel as any).instances[0] as FakeBroadcastChannel;
    instance.onmessage?.({ data: { type: 'other', store: 'x', timestamp: 0 } } as MessageEvent);
    expect(fired).toBe(false);
  });

  it('close marks channel as closed', () => {
    const a = new BroadcastSync();
    a.close();
    // Channel on first instance should be closed
    const instance = (FakeBroadcastChannel as any).instances[0] as FakeBroadcastChannel;
    expect(instance.closed).toBe(true);
  });

  it('notify after close does not throw', () => {
    const a = new BroadcastSync();
    a.close();
    expect(() => a.notify('x')).not.toThrow();
  });
});
