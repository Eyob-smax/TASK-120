import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import { deleteFile, restoreFile } from '../../src/modules/files/recycle-bin.service';
import { FileRepository, RecycleBinRepository } from '../../src/lib/db';
import { RECYCLE_BIN_RETENTION_MS } from '../../src/lib/constants';
import type { FileRecord, RecycleBinEntry } from '../../src/lib/types/files';

const fileRepo = new FileRepository();
const recycleBinRepo = new RecycleBinRepository();

async function seedFile(id: string, deleted = false): Promise<FileRecord> {
  const now = new Date().toISOString();
  const rec: FileRecord = {
    id, name: `${id}.txt`, mimeType: 'text/plain', size: 10,
    sha256: `hash-${id}`, currentVersionId: '', createdBy: 'u1', isDeleted: deleted,
    createdAt: now, updatedAt: now, version: 1,
  };
  await fileRepo.add(rec);
  return rec;
}

describe('Recycle Bin error branches', () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  it('deleteFile throws when file missing', async () => {
    await expect(deleteFile('missing', 'u1')).rejects.toThrow(/not found/i);
  });

  it('deleteFile throws when file already deleted', async () => {
    await seedFile('f1', true);
    await expect(deleteFile('f1', 'u1')).rejects.toThrow(/already/i);
  });

  it('restoreFile throws when entry not found', async () => {
    await expect(restoreFile('missing-entry')).rejects.toThrow(/not found/i);
  });

  it('restoreFile throws when original file record is missing', async () => {
    const now = new Date().toISOString();
    const entry: RecycleBinEntry = {
      id: 'rb1', fileId: 'nonexistent-file', originalName: 'ghost.txt',
      deletedBy: 'u1', deletedAt: now,
      expiresAt: new Date(Date.now() + RECYCLE_BIN_RETENTION_MS).toISOString(),
      createdAt: now, updatedAt: now, version: 1,
    };
    await recycleBinRepo.add(entry);
    await expect(restoreFile('rb1')).rejects.toThrow(/File record not found/i);
  });
});
