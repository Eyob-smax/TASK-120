import { describe, it, expect } from 'vitest';
import { sanitize } from '../../src/lib/logging/logger';

describe('Sensitive Data Sanitization', () => {
  const SENSITIVE_FIELDS = [
    'password', 'passwordHash', 'salt', 'hash', 'dek', 'iv',
    'encryptedData', 'wrappedDEK', 'dekIV', 'ciphertext', 'key', 'secret',
  ];

  it('redacts all known sensitive field names', () => {
    const input: Record<string, string> = {};
    for (const field of SENSITIVE_FIELDS) {
      input[field] = `sensitive-value-${field}`;
    }

    const result = sanitize(input) as Record<string, string>;
    for (const field of SENSITIVE_FIELDS) {
      expect(result[field]).toBe('[REDACTED]');
    }
  });

  it('redacts case-insensitively', () => {
    const result = sanitize({
      Password: 'secret',
      SALT: 'data',
      PasswordHash: 'hash123',
    }) as Record<string, string>;

    expect(result.Password).toBe('[REDACTED]');
    expect(result.SALT).toBe('[REDACTED]');
    expect(result.PasswordHash).toBe('[REDACTED]');
  });

  it('preserves non-sensitive fields', () => {
    const result = sanitize({
      username: 'admin',
      role: 'administrator',
      email: 'admin@example.com',
      count: 42,
      active: true,
    }) as Record<string, unknown>;

    expect(result.username).toBe('admin');
    expect(result.role).toBe('administrator');
    expect(result.email).toBe('admin@example.com');
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('handles nested objects', () => {
    const result = sanitize({
      user: {
        name: 'Alice',
        password: 'secret123',
        profile: {
          wrappedDEK: 'key-data',
          displayName: 'Alice A.',
        },
      },
    }) as any;

    expect(result.user.name).toBe('Alice');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.user.profile.wrappedDEK).toBe('[REDACTED]');
    expect(result.user.profile.displayName).toBe('Alice A.');
  });

  it('handles arrays of objects', () => {
    const result = sanitize([
      { name: 'A', password: 'p1' },
      { name: 'B', salt: 's2' },
    ]) as any[];

    expect(result[0].name).toBe('A');
    expect(result[0].password).toBe('[REDACTED]');
    expect(result[1].name).toBe('B');
    expect(result[1].salt).toBe('[REDACTED]');
  });

  it('handles null, undefined, and primitives', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(true)).toBe(true);
  });

  it('handles deeply nested sensitive fields', () => {
    const result = sanitize({
      level1: {
        level2: {
          level3: {
            ciphertext: 'encrypted-blob',
            message: 'safe',
          },
        },
      },
    }) as any;

    expect(result.level1.level2.level3.ciphertext).toBe('[REDACTED]');
    expect(result.level1.level2.level3.message).toBe('safe');
  });

  it('does not mutate input', () => {
    const input = { password: 'secret', name: 'test' };
    sanitize(input);
    expect(input.password).toBe('secret');
  });
});
