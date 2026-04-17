import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  uploadNewVersion,
  pauseTransfer,
  resumeTransfer,
  completeTransfer,
  getFile,
  getFiles,
  getTransferSession,
  createTransferSession,
  computeHash,
} from '../../src/modules/files/file.service';
import { FileRepository, TransferSessionRepository } from '../../src/lib/db';
import { TransferState } from '../../src/lib/types/enums';
import type { FileRecord } from '../../src/lib/types/files';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';

const fileRepo = new FileRepository();
const transferRepo = new TransferSessionRepository();
async function seedFile(id: string, deleted = false, sha256 = 'hash-x'): Promise<FileRecord> {
  const now = new Date().toISOString();
  const rec: FileRecord = {
    id,
    name: `${id}.txt`,
    mimeType: 'text/plain',
    size: 100,
    sha256,
    currentVersionId: '',
    createdBy: 'u1',
    isDeleted: deleted,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await fileRepo.add(rec);
  return rec;
}

describe('File Service — edge paths', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  describe('uploadNewVersion', () => {
    it('throws when file does not exist', async () => {
      const data = new Uint8Array(10).buffer;
      await expect(uploadNewVersion('missing-file', data, 'u1')).rejects.toThrow(/not found/i);
    });

    it('throws when file is soft-deleted', async () => {
      await seedFile('f-del', true);
      const data = new Uint8Array(10).buffer;
      await expect(uploadNewVersion('f-del', data, 'u1')).rejects.toThrow(/deleted/i);
    });

    it('skips upload when hash is identical', async () => {
      const data = new Uint8Array([1, 2, 3, 4]).buffer;
      const hash = await computeHash(data);
      await seedFile('f-same', false, hash);
      const result = await uploadNewVersion('f-same', data, 'u1');
      expect(result.deduplicated).toBe(true);
      expect(result.session).toBeNull();
    });
  });

  describe('pauseTransfer', () => {
    it('throws when session is missing', async () => {
      await expect(pauseTransfer('no-such-session')).rejects.toThrow(/not found/i);
    });

    it('throws when session is not active', async () => {
      const session = await createTransferSession('f1', 100, 1);
      // status is Pending on creation — pause requires Active
      await expect(pauseTransfer(session.id)).rejects.toThrow(/non-active/i);
    });

    it('pauses an active session', async () => {
      const session = await createTransferSession('f1', 100, 1);
      // Update to active state manually
      await transferRepo.put({ ...session, status: TransferState.Active });
      const paused = await pauseTransfer(session.id);
      expect(paused.status).toBe(TransferState.Paused);
    });
  });

  describe('resumeTransfer', () => {
    it('throws when session is missing', async () => {
      await expect(resumeTransfer('no-such-session')).rejects.toThrow(/not found/i);
    });

    it('throws when session is not paused', async () => {
      const session = await createTransferSession('f1', 100, 1);
      await expect(resumeTransfer(session.id)).rejects.toThrow(/non-paused/i);
    });

    it('resumes a paused session', async () => {
      const session = await createTransferSession('f1', 100, 1);
      await transferRepo.put({ ...session, status: TransferState.Paused });
      const resumed = await resumeTransfer(session.id);
      expect(resumed.status).toBe(TransferState.Active);
    });
  });

  describe('completeTransfer', () => {
    it('throws when session missing', async () => {
      await expect(completeTransfer('missing')).rejects.toThrow(/not found/i);
    });

    it('throws when chunks are not all completed', async () => {
      const session = await createTransferSession('f1', 100, 3);
      // completedChunks defaults to 0
      await expect(completeTransfer(session.id)).rejects.toThrow(/incomplete/i);
    });

    it('marks session as Completed when all chunks done', async () => {
      const session = await createTransferSession('f1', 100, 2);
      await transferRepo.put({ ...session, completedChunks: 2 });
      const completed = await completeTransfer(session.id);
      expect(completed.status).toBe(TransferState.Completed);
    });
  });

  describe('getters', () => {
    it('getFile returns undefined for missing', async () => {
      expect(await getFile('nope')).toBeUndefined();
    });

    it('getFile returns record for existing', async () => {
      await seedFile('found');
      expect((await getFile('found'))?.id).toBe('found');
    });

    it('getFiles returns all files including soft-deleted', async () => {
      await seedFile('a');
      await seedFile('b', true);
      const all = await getFiles();
      expect(all.length).toBe(2);
    });

    it('getTransferSession returns undefined for missing', async () => {
      expect(await getTransferSession('nope')).toBeUndefined();
    });
  });
});
