import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  ingestFile,
  computeHash,
  checkDedup,
  pauseTransfer,
  resumeTransfer,
  completeTransfer,
  uploadNewVersion,
} from '../../src/modules/files/file.service';
import { ChunkScheduler } from '../../src/modules/files/chunk-scheduler';
import { createVersion, rollbackToVersion, getVersionHistory } from '../../src/modules/files/version.service';
import { deleteFile, restoreFile, purgeExpired } from '../../src/modules/files/recycle-bin.service';
import { FileRepository, VersionRepository, RecycleBinRepository, ChunkRepository } from '../../src/lib/db';
import { TransferState } from '../../src/lib/types/enums';
import { MAX_FILE_VERSIONS, RECYCLE_BIN_RETENTION_MS, FILE_CHUNK_SIZE, MAX_CONCURRENT_CHUNKS } from '../../src/lib/constants';

const fileRepo = new FileRepository();
const versionRepo = new VersionRepository();
const recycleBinRepo = new RecycleBinRepository();
const chunkRepo = new ChunkRepository();

function makeFileData(size: number): ArrayBuffer {
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) arr[i] = i % 256;
  return arr.buffer;
}

describe('File Service', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe('computeHash', () => {
    it('computes SHA-256 hex hash', async () => {
      const data = new TextEncoder().encode('hello world').buffer;
      const hash = await computeHash(data);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('same data produces same hash', async () => {
      const data = new TextEncoder().encode('test data').buffer;
      const h1 = await computeHash(data);
      const h2 = await computeHash(data);
      expect(h1).toBe(h2);
    });
  });

  describe('ingestFile', () => {
    it('creates file record and transfer session', async () => {
      const data = makeFileData(1024);
      const { file, session, deduplicated } = await ingestFile(
        'test.txt', 1024, 'text/plain', data, 'user-1',
      );

      expect(file.name).toBe('test.txt');
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(session).not.toBeNull();
      expect(session!.totalChunks).toBe(1);
      expect(deduplicated).toBe(false);
    });

    it('deduplicates identical files', async () => {
      const data = makeFileData(512);
      await ingestFile('first.txt', 512, 'text/plain', data, 'user-1');
      const { deduplicated } = await ingestFile('second.txt', 512, 'text/plain', data, 'user-1');
      expect(deduplicated).toBe(true);
    });
  });

  describe('checkDedup', () => {
    it('returns false for unknown hash', async () => {
      const result = await checkDedup('0000000000000000000000000000000000000000000000000000000000000000');
      expect(result.exists).toBe(false);
    });
  });

  describe('transfer lifecycle', () => {
    it('pause and resume transfer', async () => {
      const data = makeFileData(FILE_CHUNK_SIZE * 2);
      const { session } = await ingestFile('big.bin', data.byteLength, 'application/octet-stream', data, 'user-1');
      if (!session) throw new Error('No session');

      // Set to active first
      const { TransferSessionRepository } = await import('../../src/lib/db');
      const tsRepo = new TransferSessionRepository();
      await tsRepo.put({ ...session, status: TransferState.Active });

      const paused = await pauseTransfer(session.id);
      expect(paused.status).toBe(TransferState.Paused);

      const resumed = await resumeTransfer(session.id);
      expect(resumed.status).toBe(TransferState.Active);
    });
  });
});

describe('ChunkScheduler', () => {
  it('limits concurrent chunks to MAX_CONCURRENT_CHUNKS', () => {
    const scheduler = new ChunkScheduler();
    expect(scheduler.getActiveCount()).toBe(0);
    expect(MAX_CONCURRENT_CHUNKS).toBe(3);
  });

  it('allows setting bandwidth cap', () => {
    const scheduler = new ChunkScheduler();
    scheduler.setBandwidthCap(1_000_000);
    expect(scheduler.getBandwidthCap()).toBe(1_000_000);
  });

  it('rejects invalid bandwidth cap', () => {
    const scheduler = new ChunkScheduler();
    expect(() => scheduler.setBandwidthCap(0)).toThrow();
    expect(() => scheduler.setBandwidthCap(-1)).toThrow();
  });

  it('never exceeds MAX_CONCURRENT_CHUNKS active uploads during scheduleChunks', async () => {
    await initDatabase();

    try {
      const numChunks = MAX_CONCURRENT_CHUNKS * 3; // 9 chunks
      const fileData = makeFileData(FILE_CHUNK_SIZE * numChunks);

      const { session } = await ingestFile(
        'concurrency-test.bin', fileData.byteLength,
        'application/octet-stream', fileData, 'user-1',
      );
      if (!session) throw new Error('No session created');

      const scheduler = new ChunkScheduler();
      let peakActive = 0;

      const origProcess = scheduler.processChunk.bind(scheduler);
      vi.spyOn(scheduler, 'processChunk').mockImplementation(
        async (fileId, chunkIndex, data) => {
          const active = scheduler.getActiveCount();
          if (active > peakActive) peakActive = active;
          expect(active).toBeLessThanOrEqual(MAX_CONCURRENT_CHUNKS);
          await new Promise(r => setTimeout(r, 5));
          return origProcess(fileId, chunkIndex, data);
        },
      );

      await scheduler.scheduleChunks(session.id, fileData);

      expect(peakActive).toBeLessThanOrEqual(MAX_CONCURRENT_CHUNKS);
      expect(peakActive).toBeGreaterThan(0);

      const chunks = await chunkRepo.getByFile(session.fileId);
      expect(chunks.length).toBe(numChunks);
    } finally {
      await resetDb();
    }
  });

  it('pause persists to IndexedDB and resume continues from checkpoint', async () => {
    await initDatabase();

    try {
      const numChunks = 6;
      const fileData = makeFileData(FILE_CHUNK_SIZE * numChunks);

      const { session } = await ingestFile(
        'pause-test.bin', fileData.byteLength,
        'application/octet-stream', fileData, 'user-1',
      );
      if (!session) throw new Error('No session created');

      const scheduler = new ChunkScheduler();
      let chunksProcessed = 0;

      const origProcess = scheduler.processChunk.bind(scheduler);
      vi.spyOn(scheduler, 'processChunk').mockImplementation(
        async (fileId, chunkIndex, data) => {
          const result = await origProcess(fileId, chunkIndex, data);
          chunksProcessed++;
          if (chunksProcessed >= 2) {
            scheduler.pause();
          }
          return result;
        },
      );

      // First run: processes some chunks then pauses
      await scheduler.scheduleChunks(session.id, fileData);

      // Persist pause state
      await pauseTransfer(session.id);

      // Verify DB state
      const { TransferSessionRepository } = await import('../../src/lib/db');
      const tsRepo = new TransferSessionRepository();
      const pausedSession = await tsRepo.getById(session.id);
      expect(pausedSession?.status).toBe(TransferState.Paused);

      // Verify partial chunks exist
      const partialChunks = await chunkRepo.getByFile(session.fileId);
      expect(partialChunks.length).toBeGreaterThan(0);
      expect(partialChunks.length).toBeLessThan(numChunks);

      // Resume
      await resumeTransfer(session.id);

      // Create a fresh scheduler (simulates page reload)
      const scheduler2 = new ChunkScheduler();
      await scheduler2.scheduleChunks(session.id, fileData);

      // Now all chunks should be done
      const allChunks = await chunkRepo.getByFile(session.fileId);
      expect(allChunks.length).toBe(numChunks);
    } finally {
      await resetDb();
    }
  });

  it('processChunk stores versionId on chunk when provided', async () => {
    await initDatabase();
    try {
      const scheduler = new ChunkScheduler();
      const chunk = await scheduler.processChunk(crypto.randomUUID(), 0, new ArrayBuffer(64), 'ver-xyz');
      expect(chunk.versionId).toBe('ver-xyz');
      const stored = await chunkRepo.getByVersion('ver-xyz');
      expect(stored).toHaveLength(1);
    } finally { await resetDb(); }
  });

  it('processChunk omits versionId when not provided', async () => {
    await initDatabase();
    try {
      const scheduler = new ChunkScheduler();
      const chunk = await scheduler.processChunk(crypto.randomUUID(), 0, new ArrayBuffer(64));
      expect(chunk.versionId).toBeUndefined();
    } finally { await resetDb(); }
  });

  it('scheduleChunks with versionId writes new chunks despite prior version chunks existing', async () => {
    await initDatabase();
    try {
      const numChunks = 2;
      const data1 = makeFileData(FILE_CHUNK_SIZE * numChunks);

      // Ingest + v1 upload with version-tagged chunks
      const { file, session: s1 } = await ingestFile('iso-test.bin', data1.byteLength, 'application/octet-stream', data1, 'u1');
      const { version: v1 } = await createVersion(file.id, file.sha256, file.size, 'u1');
      await new ChunkScheduler().scheduleChunks(s1!.id, data1, undefined, v1.id);
      await completeTransfer(s1!.id);
      expect(await chunkRepo.getByVersion(v1.id)).toHaveLength(numChunks);

      // Upload v2 with different content — scheduler must NOT skip based on v1 chunks
      const data2 = makeFileData(FILE_CHUNK_SIZE * numChunks + 16);
      const { session: s2 } = await uploadNewVersion(file.id, data2, 'u1');
      const { version: v2 } = await createVersion(file.id, await computeHash(data2), data2.byteLength, 'u1');
      await new ChunkScheduler().scheduleChunks(s2!.id, data2, undefined, v2.id);

      const numChunksV2 = Math.ceil(data2.byteLength / FILE_CHUNK_SIZE);
      // v2 has its own isolated chunks
      expect(await chunkRepo.getByVersion(v2.id)).toHaveLength(numChunksV2);
      // v1 chunks are untouched
      expect(await chunkRepo.getByVersion(v1.id)).toHaveLength(numChunks);
    } finally { await resetDb(); }
  });

  it('currentVersionId resolves to correct chunk set after multi-version upload', async () => {
    await initDatabase();
    try {
      const data1 = makeFileData(FILE_CHUNK_SIZE);
      const { file, session: s1 } = await ingestFile('prev-test.bin', data1.byteLength, 'application/octet-stream', data1, 'u1');
      const { version: v1 } = await createVersion(file.id, file.sha256, file.size, 'u1');
      await new ChunkScheduler().scheduleChunks(s1!.id, data1, undefined, v1.id);
      await completeTransfer(s1!.id);

      const data2 = makeFileData(FILE_CHUNK_SIZE + 8);
      const r2 = await uploadNewVersion(file.id, data2, 'u1');
      const { version: v2 } = await createVersion(file.id, await computeHash(data2), data2.byteLength, 'u1');
      await new ChunkScheduler().scheduleChunks(r2.session!.id, data2, undefined, v2.id);
      await completeTransfer(r2.session!.id);

      // File points to v2 after second createVersion call
      const updatedFile = await fileRepo.getById(file.id);
      expect(updatedFile?.currentVersionId).toBe(v2.id);

      // Preview path: getByVersion(currentVersionId) returns v2 chunks only
      const previewChunks = await chunkRepo.getByVersion(v2.id);
      expect(previewChunks.length).toBeGreaterThan(0);
      expect(previewChunks.every(c => c.versionId === v2.id)).toBe(true);

      // v1 chunks still isolated
      const v1Chunks = await chunkRepo.getByVersion(v1.id);
      expect(v1Chunks.length).toBeGreaterThan(0);
      expect(v1Chunks.every(c => c.versionId === v1.id)).toBe(true);
    } finally { await resetDb(); }
  });

  it('resumed scheduleChunks completes version-tagged chunks without re-writing existing ones', async () => {
    await initDatabase();
    try {
      // 6 chunks: with MAX_CONCURRENT=3, the pool fills and the loop hits
      // the isPaused break before issuing all chunks, ensuring a true partial run.
      const numChunks = 6;
      const fileData = makeFileData(FILE_CHUNK_SIZE * numChunks);
      const { file, session } = await ingestFile('resume-v.bin', fileData.byteLength, 'application/octet-stream', fileData, 'u1');
      const { version: v1 } = await createVersion(file.id, file.sha256, file.size, 'u1');

      // Partial first run: pause after 2 chunks
      const sched1 = new ChunkScheduler();
      let count = 0;
      const origProcess = sched1.processChunk.bind(sched1);
      vi.spyOn(sched1, 'processChunk').mockImplementation(async (fid, idx, data, vid) => {
        const result = await origProcess(fid, idx, data, vid);
        if (++count >= 2) sched1.pause();
        return result;
      });
      await sched1.scheduleChunks(session!.id, fileData, undefined, v1.id);
      await pauseTransfer(session!.id);

      const partial = await chunkRepo.getByVersion(v1.id);
      expect(partial.length).toBeGreaterThan(0);
      expect(partial.length).toBeLessThan(numChunks);

      // Resume with same versionId — only missing chunks are written
      await resumeTransfer(session!.id);
      await new ChunkScheduler().scheduleChunks(session!.id, fileData, undefined, v1.id);

      const all = await chunkRepo.getByVersion(v1.id);
      expect(all).toHaveLength(numChunks);
    } finally { await resetDb(); }
  });
});

describe('Version Service', () => {
  beforeEach(async () => {
    await initDatabase();
    // Seed a file record
    const now = new Date().toISOString();
    await fileRepo.add({
      id: 'file-1', name: 'test.txt', mimeType: 'text/plain', size: 100,
      sha256: 'abc', currentVersionId: '', createdBy: 'u1', isDeleted: false,
      createdAt: now, updatedAt: now, version: 1,
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  it('creates version with incrementing number', async () => {
    const { version: v1 } = await createVersion('file-1', 'hash1', 100, 'u1');
    const { version: v2 } = await createVersion('file-1', 'hash2', 200, 'u1');

    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
  });

  it('enforces 10-version retention limit', async () => {
    for (let i = 0; i < 12; i++) {
      await createVersion('file-1', `hash-${i}`, 100, 'u1');
    }

    const history = await getVersionHistory('file-1');
    expect(history.length).toBeLessThanOrEqual(MAX_FILE_VERSIONS);
  });

  it('rollback points file currentVersionId to target version', async () => {
    const { version: v1 } = await createVersion('file-1', 'original-hash', 100, 'u1');
    await createVersion('file-1', 'updated-hash', 200, 'u1');

    const rolledBack = await rollbackToVersion('file-1', v1.id, 'u1');
    // Returns the target version directly (no new version record created)
    expect(rolledBack.sha256).toBe('original-hash');
    expect(rolledBack.versionNumber).toBe(1);

    // File record currentVersionId now points to v1
    const file = await fileRepo.getById('file-1');
    expect(file?.currentVersionId).toBe(v1.id);
  });
});

describe('Recycle Bin Service', () => {
  beforeEach(async () => {
    await initDatabase();
    const now = new Date().toISOString();
    await fileRepo.add({
      id: 'file-1', name: 'test.txt', mimeType: 'text/plain', size: 100,
      sha256: 'abc', currentVersionId: '', createdBy: 'u1', isDeleted: false,
      createdAt: now, updatedAt: now, version: 1,
    });
  });

  afterEach(async () => {
    await resetDb();
  });

  it('soft deletes file and creates recycle bin entry', async () => {
    const entry = await deleteFile('file-1', 'u1');
    expect(entry.fileId).toBe('file-1');
    expect(entry.originalName).toBe('test.txt');

    const file = await fileRepo.getById('file-1');
    expect(file?.isDeleted).toBe(true);
  });

  it('restores file from recycle bin', async () => {
    const entry = await deleteFile('file-1', 'u1');
    const restored = await restoreFile(entry.id);

    expect(restored.isDeleted).toBe(false);

    const binEntry = await recycleBinRepo.getById(entry.id);
    expect(binEntry).toBeUndefined();
  });

  it('rejects deleting already-deleted file', async () => {
    await deleteFile('file-1', 'u1');
    await expect(deleteFile('file-1', 'u1')).rejects.toThrow('already deleted');
  });

  it('purges entries older than 30 days', async () => {
    await deleteFile('file-1', 'u1');

    // Purge with current time — should not remove anything
    const purgedNow = await purgeExpired(new Date());
    expect(purgedNow).toBe(0);

    // Purge with future time past retention
    const futureDate = new Date(Date.now() + RECYCLE_BIN_RETENTION_MS + 86_400_000);
    const purgedFuture = await purgeExpired(futureDate);
    expect(purgedFuture).toBe(1);

    // File should be permanently deleted
    const file = await fileRepo.getById('file-1');
    expect(file).toBeUndefined();
  });
});

describe('ChunkRepository version scoping', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('getByVersion returns only chunks with matching versionId', async () => {
    const fileId = crypto.randomUUID();
    const now = new Date().toISOString();
    const base = { fileId, data: new ArrayBuffer(8), size: 8, createdAt: now, updatedAt: now, version: 1 as const };

    await chunkRepo.add({ ...base, id: crypto.randomUUID(), chunkIndex: 0, versionId: 'v-a' });
    await chunkRepo.add({ ...base, id: crypto.randomUUID(), chunkIndex: 1, versionId: 'v-a' });
    await chunkRepo.add({ ...base, id: crypto.randomUUID(), chunkIndex: 0, versionId: 'v-b' });

    expect(await chunkRepo.getByVersion('v-a')).toHaveLength(2);
    expect(await chunkRepo.getByVersion('v-b')).toHaveLength(1);
    expect(await chunkRepo.getByVersion('v-unknown')).toHaveLength(0);
  });

  it('getByFile still finds chunks that have no versionId (backward compat)', async () => {
    const fileId = crypto.randomUUID();
    const now = new Date().toISOString();
    await chunkRepo.add({
      id: crypto.randomUUID(), fileId, chunkIndex: 0,
      data: new ArrayBuffer(4), size: 4, createdAt: now, updatedAt: now, version: 1,
    });

    const byFile = await chunkRepo.getByFile(fileId);
    expect(byFile).toHaveLength(1);
    expect(byFile[0].versionId).toBeUndefined();

    // Legacy chunks have no versionId so getByVersion returns nothing
    expect(await chunkRepo.getByVersion('any-id')).toHaveLength(0);
  });
});
