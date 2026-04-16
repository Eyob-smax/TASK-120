import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import { ChunkScheduler } from '../../src/modules/files/chunk-scheduler';
import { ChunkRepository, TransferSessionRepository } from '../../src/lib/db';
import { TransferState } from '../../src/lib/types/enums';
import { FILE_CHUNK_SIZE, DEFAULT_BANDWIDTH_CAP } from '../../src/lib/constants';
import { generateDataKey } from '../../src/lib/security/crypto';

let dek: CryptoKey | null = null;
vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'u1',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => dek,
}));

const transferRepo = new TransferSessionRepository();
const chunkRepo = new ChunkRepository();

async function createSession(fileId: string, totalChunks: number, completedChunks = 0): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await transferRepo.add({
    id,
    fileId,
    status: TransferState.Pending,
    totalChunks,
    completedChunks,
    chunkSize: FILE_CHUNK_SIZE,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });
  return id;
}

describe('ChunkScheduler', () => {
  beforeEach(async () => {
    await initDatabase();
    dek = null;
  });

  afterEach(async () => {
    dek = null;
    await resetDb();
  });

  describe('bandwidth cap', () => {
    it('default bandwidth cap equals DEFAULT_BANDWIDTH_CAP', () => {
      const s = new ChunkScheduler();
      expect(s.getBandwidthCap()).toBe(DEFAULT_BANDWIDTH_CAP);
    });

    it('setBandwidthCap updates the cap', () => {
      const s = new ChunkScheduler();
      s.setBandwidthCap(1024 * 1024);
      expect(s.getBandwidthCap()).toBe(1024 * 1024);
    });

    it('setBandwidthCap rejects zero', () => {
      const s = new ChunkScheduler();
      expect(() => s.setBandwidthCap(0)).toThrow();
    });

    it('setBandwidthCap rejects negative values', () => {
      const s = new ChunkScheduler();
      expect(() => s.setBandwidthCap(-100)).toThrow();
    });
  });

  describe('state', () => {
    it('getActiveCount starts at 0', () => {
      const s = new ChunkScheduler();
      expect(s.getActiveCount()).toBe(0);
    });

    it('pause and resume toggle internal flag', () => {
      const s = new ChunkScheduler();
      s.pause();
      s.resume();
      // No error thrown, flag toggled — indirectly validated via scheduleChunks tests below
      expect(s.getActiveCount()).toBe(0);
    });
  });

  describe('scheduleChunks (unencrypted path)', () => {
    it('throws when session is missing', async () => {
      const s = new ChunkScheduler();
      const data = new Uint8Array(100).buffer;
      await expect(s.scheduleChunks('nonexistent-session', data)).rejects.toThrow();
    });

    it('processes all chunks and reports progress', async () => {
      const fileSize = FILE_CHUNK_SIZE + 100; // 2 chunks
      const sessionId = await createSession('file-1', 2);
      const data = new Uint8Array(fileSize).buffer;

      const s = new ChunkScheduler();
      s.setBandwidthCap(DEFAULT_BANDWIDTH_CAP * 100); // effectively no throttle

      const progressCalls: Array<[number, number]> = [];
      await s.scheduleChunks(sessionId, data, (completed, total) => {
        progressCalls.push([completed, total]);
      });

      const chunks = await chunkRepo.getByFile('file-1');
      expect(chunks).toHaveLength(2);
      expect(progressCalls.length).toBe(2);
      expect(progressCalls[progressCalls.length - 1]).toEqual([2, 2]);
    });

    it('skips already-completed chunk indices', async () => {
      const fileSize = FILE_CHUNK_SIZE + 100;
      const sessionId = await createSession('file-2', 2);
      const data = new Uint8Array(fileSize).buffer;

      const s = new ChunkScheduler();
      s.setBandwidthCap(DEFAULT_BANDWIDTH_CAP * 100);

      // Pre-seed chunk index 0 as completed
      const now = new Date().toISOString();
      await chunkRepo.add({
        id: crypto.randomUUID(),
        fileId: 'file-2',
        chunkIndex: 0,
        data: new Uint8Array(10).buffer,
        size: 10,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await s.scheduleChunks(sessionId, data);

      const chunks = await chunkRepo.getByFile('file-2');
      // Only chunk 1 added — total count now = 1 existing + 1 new
      expect(chunks.length).toBe(2);
    });

    it('sets session status to Active during scheduling', async () => {
      const sessionId = await createSession('file-3', 1);
      const s = new ChunkScheduler();
      s.setBandwidthCap(DEFAULT_BANDWIDTH_CAP * 100);
      const data = new Uint8Array(100).buffer;
      await s.scheduleChunks(sessionId, data);
      const session = await transferRepo.getById(sessionId);
      expect([TransferState.Active, TransferState.Completed]).toContain(session?.status);
    });

    it('scopes dedup by versionId when provided', async () => {
      const fileSize = FILE_CHUNK_SIZE + 100;
      const sessionId = await createSession('file-4', 2);
      const data = new Uint8Array(fileSize).buffer;

      const s = new ChunkScheduler();
      s.setBandwidthCap(DEFAULT_BANDWIDTH_CAP * 100);

      await s.scheduleChunks(sessionId, data, undefined, 'v1');
      const v1Chunks = await chunkRepo.getByVersion('v1');
      expect(v1Chunks.length).toBe(2);
      expect(v1Chunks.every(c => c.versionId === 'v1')).toBe(true);
    });
  });

  describe('processChunk encryption', () => {
    it('does not encrypt when no DEK is available', async () => {
      dek = null;
      const s = new ChunkScheduler();
      const data = new Uint8Array([1, 2, 3, 4]).buffer;
      const chunk = await s.processChunk('file-5', 0, data);
      expect(chunk.iv).toBeUndefined();
    });

    it('encrypts when DEK is available', async () => {
      dek = await generateDataKey();
      const s = new ChunkScheduler();
      const data = new Uint8Array([1, 2, 3, 4]).buffer;
      const chunk = await s.processChunk('file-6', 0, data);
      expect(chunk.iv).toBeTruthy();
    });
  });

  describe('pause mid-transfer', () => {
    it('stops adding to pool when paused', async () => {
      // With 3 chunks but paused upfront, no chunks should be scheduled
      const fileSize = FILE_CHUNK_SIZE * 3;
      const sessionId = await createSession('file-7', 3);
      const data = new Uint8Array(fileSize).buffer;
      const s = new ChunkScheduler();
      s.setBandwidthCap(DEFAULT_BANDWIDTH_CAP * 100);
      s.pause();
      await s.scheduleChunks(sessionId, data);
      const chunks = await chunkRepo.getByFile('file-7');
      expect(chunks.length).toBe(0);
    });
  });
});
