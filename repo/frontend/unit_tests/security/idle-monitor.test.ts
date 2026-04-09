import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleLockMonitor } from '../../src/lib/security/idle-monitor';
import { IDLE_LOCK_TIMEOUT_MS } from '../../src/lib/constants';

describe('IdleLockMonitor', () => {
  let monitor: IdleLockMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new IdleLockMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  it('fires lock callback after idle timeout', () => {
    const onLock = vi.fn();
    monitor.start(onLock);

    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('does not fire before timeout', () => {
    const onLock = vi.fn();
    monitor.start(onLock);

    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS - 1);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('resets timer on activity events', () => {
    const onLock = vi.fn();
    monitor.start(onLock);

    // Advance to just before timeout
    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS - 1000);

    // Simulate activity
    document.dispatchEvent(new Event('mousemove'));

    // Advance past original timeout but not new one
    vi.advanceTimersByTime(2000);
    expect(onLock).not.toHaveBeenCalled();

    // Advance to new timeout
    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS - 2000);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('resets timer on keydown', () => {
    const onLock = vi.fn();
    monitor.start(onLock);

    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS - 1000);
    document.dispatchEvent(new Event('keydown'));

    vi.advanceTimersByTime(2000);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('stop prevents lock callback', () => {
    const onLock = vi.fn();
    monitor.start(onLock);

    monitor.stop();
    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS * 2);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('can start and stop multiple times', () => {
    const onLock1 = vi.fn();
    const onLock2 = vi.fn();

    monitor.start(onLock1);
    monitor.stop();
    monitor.start(onLock2);

    vi.advanceTimersByTime(IDLE_LOCK_TIMEOUT_MS);
    expect(onLock1).not.toHaveBeenCalled();
    expect(onLock2).toHaveBeenCalledTimes(1);
  });
});
