import { IDLE_LOCK_TIMEOUT_MS } from '$lib/constants';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export class IdleLockMonitor {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onLock: (() => void) | null = null;
  private boundHandler: (() => void) | null = null;

  start(onLock: () => void): void {
    this.onLock = onLock;
    this.boundHandler = this.resetTimer.bind(this);
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, this.boundHandler, { passive: true });
    }
    this.resetTimer();
  }

  stop(): void {
    if (this.boundHandler) {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, this.boundHandler);
      }
      this.boundHandler = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.onLock = null;
  }

  resetTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(() => {
      this.onLock?.();
    }, IDLE_LOCK_TIMEOUT_MS);
  }

  updateLastActivity(): void {
    this.resetTimer();
  }
}
