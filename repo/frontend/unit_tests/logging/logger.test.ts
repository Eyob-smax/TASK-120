import { describe, it, expect, vi } from 'vitest';
import { sanitize, createLogger } from '../../src/lib/logging/logger';

describe('Logger', () => {
  describe('sanitize', () => {
    it('redacts password field', () => {
      const result = sanitize({ username: 'admin', password: 'secret123' });
      expect(result).toEqual({ username: 'admin', password: '[REDACTED]' });
    });

    it('redacts passwordHash field', () => {
      const result = sanitize({ passwordHash: 'abc123', salt: 'xyz' });
      expect(result).toEqual({ passwordHash: '[REDACTED]', salt: '[REDACTED]' });
    });

    it('redacts nested sensitive fields', () => {
      const result = sanitize({
        user: { name: 'Alice', wrappedDEK: 'key-data', dekIV: 'iv-data' },
      });
      expect(result).toEqual({
        user: { name: 'Alice', wrappedDEK: '[REDACTED]', dekIV: '[REDACTED]' },
      });
    });

    it('preserves non-sensitive fields', () => {
      const result = sanitize({ username: 'admin', role: 'administrator' });
      expect(result).toEqual({ username: 'admin', role: 'administrator' });
    });

    it('handles null and undefined', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
    });

    it('handles primitives', () => {
      expect(sanitize('hello')).toBe('hello');
      expect(sanitize(42)).toBe(42);
      expect(sanitize(true)).toBe(true);
    });

    it('handles arrays', () => {
      const result = sanitize([
        { name: 'a', password: 'secret' },
        { name: 'b', password: 'other' },
      ]);
      expect(result).toEqual([
        { name: 'a', password: '[REDACTED]' },
        { name: 'b', password: '[REDACTED]' },
      ]);
    });

    it('redacts case-insensitively', () => {
      const result = sanitize({ Password: 'secret', SALT: 'data' });
      expect(result).toEqual({ Password: '[REDACTED]', SALT: '[REDACTED]' });
    });
  });

  describe('createLogger', () => {
    it('returns an object with debug, info, warn, error methods', () => {
      const logger = createLogger('auth');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('calls console.info with correct prefix', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createLogger('security');
      logger.info('test message');
      expect(spy).toHaveBeenCalledWith('[security] [info] test message');
      spy.mockRestore();
    });

    it('calls console.warn with correct prefix', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger('app');
      logger.warn('warning msg');
      expect(spy).toHaveBeenCalledWith('[app] [warn] warning msg');
      spy.mockRestore();
    });

    it('sanitizes logged arguments', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createLogger('auth');
      logger.error('login failed', { username: 'admin', password: 'secret' });
      expect(spy).toHaveBeenCalledWith(
        '[auth] [error] login failed',
        { username: 'admin', password: '[REDACTED]' },
      );
      spy.mockRestore();
    });
  });
});
