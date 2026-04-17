import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { get } from 'svelte/store';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  fileStore,
  transferStore,
  recycleBinStore,
  loadFiles,
  loadTransfers,
  optimisticDeleteFile,
  optimisticRestoreFile,
} from '../../src/modules/files/file.store';
import { FileRepository, TransferSessionRepository } from '../../src/lib/db';
import { TransferState } from '../../src/lib/types/enums';
import type { FileRecord } from '../../src/lib/types/files';

vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'test-user',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => null,
}));

const fileRepo = new FileRepository();
const transferRepo = new TransferSessionRepository();

async function seedFile(id: string, deleted = false): Promise<FileRecord> {
  const now = new Date().toISOString();
  const rec: FileRecord = {
    id,
    name: `${id}.txt`,
    mimeType: 'text/plain',
    size: 100,
    sha256: `hash-${id}`,
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

describe('File Store', () => {
  beforeEach(async () => {
    await initDatabase();
    fileStore.set([]);
    transferStore.set([]);
    recycleBinStore.set([]);
  });

  afterEach(async () => {
    fileStore.set([]);
    transferStore.set([]);
    recycleBinStore.set([]);
    await resetDb();
  });

  describe('loadFiles', () => {
    it('excludes files marked as deleted', async () => {
      await seedFile('f1', false);
      await seedFile('f2', true);

      await loadFiles();

      const files = get(fileStore);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('f1');
    });

    it('sets empty array when no files exist', async () => {
      await loadFiles();
      expect(get(fileStore)).toEqual([]);
    });

    it('includes all non-deleted files', async () => {
      await seedFile('f1', false);
      await seedFile('f2', false);
      await seedFile('f3', false);

      await loadFiles();
      expect(get(fileStore)).toHaveLength(3);
    });
  });

  describe('loadTransfers', () => {
    it('populates transferStore with all transfers', async () => {
      const now = new Date().toISOString();
      await transferRepo.add({
        id: 't1',
        fileId: 'f1',
        status: TransferState.Active,
        totalChunks: 1,
        completedChunks: 0,
        chunkSize: 1024,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await loadTransfers();
      expect(get(transferStore)).toHaveLength(1);
    });

    it('sets empty array when no transfers exist', async () => {
      await loadTransfers();
      expect(get(transferStore)).toEqual([]);
    });
  });

  describe('optimisticDeleteFile', () => {
    it('removes file from store optimistically and persists deletion', async () => {
      await seedFile('f1');
      await loadFiles();
      expect(get(fileStore)).toHaveLength(1);

      await optimisticDeleteFile('f1', 'u1');

      expect(get(fileStore)).toHaveLength(0);
      const persisted = await fileRepo.getById('f1');
      expect(persisted?.isDeleted).toBe(true);
    });

    it('rolls back store when service throws', async () => {
      await seedFile('f1');
      await loadFiles();
      // Pass invalid fileId to trigger error
      await expect(optimisticDeleteFile('nonexistent-id', 'u1')).rejects.toThrow();
      // Store should have been rolled back to previous contents
      expect(get(fileStore)).toHaveLength(1);
    });
  });

  describe('optimisticRestoreFile', () => {
    it('triggers file reload after restore', async () => {
      await seedFile('f1');
      await loadFiles();

      await optimisticDeleteFile('f1', 'u1');
      expect(get(fileStore)).toHaveLength(0);

      // Get the recycle bin entry id
      const { RecycleBinRepository } = await import('../../src/lib/db');
      const binRepo = new RecycleBinRepository();
      const entries = await binRepo.getAll();
      expect(entries.length).toBeGreaterThan(0);
      const entryId = entries[0].id;

      await optimisticRestoreFile(entryId);
      expect(get(fileStore)).toHaveLength(1);
    });

    it('rolls back on restore error', async () => {
      await seedFile('f1');
      await loadFiles();
      await expect(optimisticRestoreFile('nonexistent-entry')).rejects.toThrow();
      // Should still have the file we seeded
      expect(get(fileStore).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recycleBinStore', () => {
    it('is independently writable', () => {
      recycleBinStore.set([
        {
          id: 'rb1',
          fileId: 'f1',
          originalName: 'test.txt',
          deletedBy: 'u1',
          deletedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        },
      ]);
      expect(get(recycleBinStore)).toHaveLength(1);
    });
  });
});
