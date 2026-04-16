import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  unlock,
  createInitialAdmin,
  login,
  lock,
  logout,
} from '../../src/lib/security/auth.service';
import { Repository, STORE_NAMES } from '../../src/lib/db';
import type { User } from '../../src/lib/types/auth';

describe('auth.service unlock error branches', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    logout();
    await resetDb();
  });

  it('unlock throws when no session exists', async () => {
    await expect(unlock('anything')).rejects.toThrow(/No locked session/i);
  });

  it('unlock throws when session is not locked', async () => {
    await createInitialAdmin('admin', 'StrongPass1', { displayName: 'Admin' });
    await login('admin', 'StrongPass1');
    // Not locked — unlock must throw
    await expect(unlock('StrongPass1')).rejects.toThrow(/No locked session/i);
  });

  it('unlock throws when user record is missing', async () => {
    await createInitialAdmin('admin', 'StrongPass1', { displayName: 'Admin' });
    await login('admin', 'StrongPass1');
    lock();

    // Delete the user behind the session
    const userRepo = new Repository<User>(STORE_NAMES.USERS);
    const users = await userRepo.getAll();
    for (const u of users) await userRepo.delete(u.id);

    await expect(unlock('StrongPass1')).rejects.toThrow(/User not found/i);
  });
});
