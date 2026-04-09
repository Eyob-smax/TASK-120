import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  enrollProfile,
  startEnrollment,
  updateSessionStatus,
  getProfiles,
  getProfileById,
} from '../../src/modules/identity/identity.service';
import { FaceProfileRepository, CaptureSessionRepository } from '../../src/lib/db';

describe('Identity Service', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  describe('enrollProfile', () => {
    it('creates a profile record', async () => {
      const profile = await enrollProfile('Alice', 'g1', { dept: 'ops' });
      expect(profile.id).toBeTruthy();
      expect(profile.name).toBe('Alice');
      expect(profile.groupId).toBe('g1');
      expect(profile.attributes.dept).toBe('ops');
      expect(profile.enrolledAt).toBeTruthy();
    });

    it('persists to IndexedDB', async () => {
      const profile = await enrollProfile('Bob');
      const retrieved = await getProfileById(profile.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Bob');
    });
  });

  describe('startEnrollment', () => {
    it('creates a capture session', async () => {
      const session = await startEnrollment('profile-1');
      expect(session.id).toBeTruthy();
      expect(session.profileId).toBe('profile-1');
      expect(session.status).toBe('initializing');
    });
  });

  describe('updateSessionStatus', () => {
    it('transitions session status', async () => {
      const session = await startEnrollment('p1');
      const updated = await updateSessionStatus(session.id, 'capturing');
      expect(updated.status).toBe('capturing');
    });

    it('sets completedAt on completion', async () => {
      const session = await startEnrollment('p1');
      const completed = await updateSessionStatus(session.id, 'completed');
      expect(completed.completedAt).toBeTruthy();
    });

    it('sets completedAt on failure', async () => {
      const session = await startEnrollment('p1');
      const failed = await updateSessionStatus(session.id, 'failed');
      expect(failed.completedAt).toBeTruthy();
    });

    it('throws for nonexistent session', async () => {
      await expect(updateSessionStatus('fake-id', 'capturing')).rejects.toThrow();
    });
  });

  describe('getProfiles', () => {
    it('returns all profiles', async () => {
      await enrollProfile('Alice');
      await enrollProfile('Bob');
      const profiles = await getProfiles();
      expect(profiles.length).toBe(2);
    });

    it('returns empty array when no profiles', async () => {
      const profiles = await getProfiles();
      expect(profiles).toEqual([]);
    });
  });
});
