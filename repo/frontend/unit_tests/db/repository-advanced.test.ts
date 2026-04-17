import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { Repository, withTransaction } from '../../src/lib/db/repository';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import { STORE_NAMES } from '../../src/lib/db/schema';
import type { BaseEntity } from '../../src/lib/types/common';
import { UserRole } from '../../src/lib/types/enums';

interface TestUser extends BaseEntity {
  username: string;
  role: UserRole;
}

describe('Repository advanced helpers', () => {
  let repo: Repository<TestUser>;

  beforeEach(async () => {
    await initDatabase();
    repo = new Repository<TestUser>(STORE_NAMES.USERS);
  });

  afterEach(async () => {
    await resetDb();
  });

  function makeUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: overrides.id ?? `u-${crypto.randomUUID()}`,
      username: overrides.username ?? 'user',
      role: overrides.role ?? UserRole.Administrator,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
      ...overrides,
    };
  }

  describe('getByIndex / getOneByIndex', () => {
    it('getByIndex returns matching records', async () => {
      await repo.put(makeUser({ id: 'u1', username: 'alice' }));
      await repo.put(makeUser({ id: 'u2', username: 'bob' }));
      const byName = await repo.getByIndex('username', 'alice');
      expect(byName).toHaveLength(1);
      expect(byName[0].username).toBe('alice');
    });

    it('getByIndex returns empty array for no matches', async () => {
      const result = await repo.getByIndex('username', 'nobody');
      expect(result).toEqual([]);
    });

    it('getOneByIndex returns single record', async () => {
      await repo.put(makeUser({ id: 'u1', username: 'carol' }));
      const one = await repo.getOneByIndex('username', 'carol');
      expect(one?.username).toBe('carol');
    });

    it('getOneByIndex returns undefined when not found', async () => {
      const one = await repo.getOneByIndex('username', 'nobody');
      expect(one).toBeUndefined();
    });
  });

  describe('countByIndex', () => {
    it('returns 0 when no matches', async () => {
      const n = await repo.countByIndex('role', UserRole.Auditor);
      expect(n).toBe(0);
    });

    it('returns correct count', async () => {
      // username index is unique; role is non-unique so we can have multiple matches
      await repo.put(makeUser({ id: 'u1', username: 'alice', role: UserRole.PickerPacker }));
      await repo.put(makeUser({ id: 'u2', username: 'bob', role: UserRole.PickerPacker }));
      await repo.put(makeUser({ id: 'u3', username: 'carol', role: UserRole.Administrator }));
      const count = await repo.countByIndex('role', UserRole.PickerPacker);
      expect(count).toBe(2);
    });
  });

  describe('add', () => {
    it('rejects adding duplicate id', async () => {
      const user = makeUser({ id: 'dup', username: 'x' });
      await repo.add(user);
      await expect(repo.add(user)).rejects.toBeTruthy();
    });
  });
});

describe('withTransaction helper', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('commits when fn succeeds', async () => {
    const result = await withTransaction([STORE_NAMES.USERS], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE_NAMES.USERS);
      const now = new Date().toISOString();
      await store.put({
        id: 'tx-1',
        username: 'transactional',
        role: UserRole.Administrator,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      return 'ok';
    });
    expect(result).toBe('ok');

    const repo = new Repository<TestUser>(STORE_NAMES.USERS);
    const stored = await repo.getById('tx-1');
    expect(stored?.username).toBe('transactional');
  });

  it('aborts and re-throws when fn throws', async () => {
    // Suppress unhandled abort rejection from fake-indexeddb tx.abort()
    const prior = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', () => { /* swallow */ });

    await expect(
      withTransaction([STORE_NAMES.USERS], 'readwrite', async () => {
        throw new Error('intentional');
      }),
    ).rejects.toThrow('intentional');

    // Allow microtasks to drain any aborted transaction errors
    await new Promise(r => setTimeout(r, 10));

    process.removeAllListeners('unhandledRejection');
    for (const l of prior) process.on('unhandledRejection', l as any);
  });
});
