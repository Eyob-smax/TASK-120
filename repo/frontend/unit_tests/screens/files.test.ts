import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { ingestFile } from '../../src/modules/files/file.service';
import { createVersion, rollbackToVersion, getVersionHistory } from '../../src/modules/files/version.service';
import { deleteFile, restoreFile, purgeExpired } from '../../src/modules/files/recycle-bin.service';
import { FileRepository } from '../../src/lib/db';
import { MAX_FILE_VERSIONS, RECYCLE_BIN_RETENTION_MS } from '../../src/lib/constants';

const hasWebCrypto = typeof globalThis.crypto?.subtle !== 'undefined';
const fileRepo = new FileRepository();

function makeData(size: number): ArrayBuffer {
  return new Uint8Array(size).buffer;
}

describe.skipIf(!hasWebCrypto)('File Screen Workflows', () => {
  beforeEach(async () => {
    await initDatabase();
  });
  afterEach(async () => { await resetDb(); });

  it('upload triggers ingestFile and creates records', async () => {
    const data = makeData(1024);
    const { file, session, deduplicated } = await ingestFile('test.txt', 1024, 'text/plain', data, 'u1');
    expect(file.name).toBe('test.txt');
    expect(session).toBeTruthy();
    expect(deduplicated).toBe(false);
  });

  it('dedup shows feedback for identical file', async () => {
    const data = makeData(512);
    await ingestFile('first.txt', 512, 'text/plain', data, 'u1');
    const { deduplicated } = await ingestFile('second.txt', 512, 'text/plain', data, 'u1');
    expect(deduplicated).toBe(true);
  });
});

describe('Version Drawer Workflows', () => {
  beforeEach(async () => {
    await initDatabase();
    const now = new Date().toISOString();
    await fileRepo.add({
      id: 'f1', name: 'doc.txt', mimeType: 'text/plain', size: 100,
      sha256: 'hash1', currentVersionId: '', createdBy: 'u1', isDeleted: false,
      createdAt: now, updatedAt: now, version: 1,
    });
  });
  afterEach(async () => { await resetDb(); });

  it('version history shows versions in order', async () => {
    await createVersion('f1', 'h1', 100, 'u1');
    await createVersion('f1', 'h2', 200, 'u1');
    const history = await getVersionHistory('f1');
    expect(history[0].versionNumber).toBeGreaterThan(history[1].versionNumber);
  });

  it('rollback updates file currentVersionId to target version', async () => {
    const { version: v1 } = await createVersion('f1', 'original', 100, 'u1');
    await createVersion('f1', 'updated', 200, 'u1');
    const rolledBack = await rollbackToVersion('f1', v1.id, 'u1');
    // Returns target version directly — no new version record is created
    expect(rolledBack.sha256).toBe('original');
    expect(rolledBack.versionNumber).toBe(1);
    // File pointer now aims at the target version whose chunks exist
    const file = await fileRepo.getById('f1');
    expect(file?.currentVersionId).toBe(v1.id);
  });
});

describe('Recycle Bin Workflows', () => {
  beforeEach(async () => {
    await initDatabase();
    const now = new Date().toISOString();
    await fileRepo.add({
      id: 'f1', name: 'doc.txt', mimeType: 'text/plain', size: 100,
      sha256: 'hash1', currentVersionId: '', createdBy: 'u1', isDeleted: false,
      createdAt: now, updatedAt: now, version: 1,
    });
  });
  afterEach(async () => { await resetDb(); });

  it('delete moves to recycle bin, restore brings back', async () => {
    const entry = await deleteFile('f1', 'u1');
    let file = await fileRepo.getById('f1');
    expect(file?.isDeleted).toBe(true);

    await restoreFile(entry.id);
    file = await fileRepo.getById('f1');
    expect(file?.isDeleted).toBe(false);
  });

  it('purge removes expired entries', async () => {
    await deleteFile('f1', 'u1');
    const future = new Date(Date.now() + RECYCLE_BIN_RETENTION_MS + 86400000);
    const count = await purgeExpired(future);
    expect(count).toBe(1);
  });
});
