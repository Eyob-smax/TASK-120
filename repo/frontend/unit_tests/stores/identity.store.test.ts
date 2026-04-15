import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  identityStore,
  captureStore,
  loadProfiles,
} from '../../src/modules/identity/identity.store';
import { FaceProfileRepository } from '../../src/lib/db';
import type { FaceProfile, CaptureSession } from '../../src/lib/types/identity';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'u1',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

const profileRepo = new FaceProfileRepository();

function makeProfile(id: string): FaceProfile {
  const now = new Date().toISOString();
  return {
    id,
    name: `Profile ${id}`,
    attributes: {},
    groupId: undefined,
    enrolledBy: 'u1',
    enrolledAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

describe('Identity Store', () => {
  beforeEach(async () => {
    await initDatabase();
    identityStore.set([]);
    captureStore.set(null);
  });

  afterEach(async () => {
    identityStore.set([]);
    captureStore.set(null);
    await resetDb();
  });

  it('identityStore initial value is empty array', () => {
    expect(get(identityStore)).toEqual([]);
  });

  it('captureStore initial value is null', () => {
    expect(get(captureStore)).toBeNull();
  });

  it('captureStore accepts CaptureSession writes', () => {
    const session: CaptureSession = {
      id: 's1',
      profileId: 'p1',
      startedAt: new Date().toISOString(),
      status: 'capturing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    captureStore.set(session);
    expect(get(captureStore)).toEqual(session);
  });

  it('loadProfiles populates identityStore from repository', async () => {
    await profileRepo.add(makeProfile('p1'));
    await profileRepo.add(makeProfile('p2'));

    await loadProfiles();

    expect(get(identityStore)).toHaveLength(2);
  });

  it('loadProfiles sets empty array when no profiles exist', async () => {
    await loadProfiles();
    expect(get(identityStore)).toEqual([]);
  });
});
