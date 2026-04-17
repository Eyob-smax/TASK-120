import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from '../../src/lib/logging/logger';

describe('Logger debug path', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debug emits to console.debug in DEV mode', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = createLogger('app');
    logger.debug('dev message', { hello: 'world' });
    // In vitest dev env, import.meta.env.DEV is true -> debug fires
    expect(spy).toHaveBeenCalled();
  });

  it('debug sanitizes sensitive args', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = createLogger('auth');
    logger.debug('payload', { password: 'secret' });
    const call = spy.mock.calls[0];
    if (call) {
      expect(JSON.stringify(call)).toContain('REDACTED');
    }
  });
});
