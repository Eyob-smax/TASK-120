import { ChunkRepository, TransferSessionRepository } from '$lib/db';
import { validateChunkSize } from '$lib/validators';
import { ValidationServiceError } from '$lib/services/errors';
import { createLogger } from '$lib/logging';
import { FILE_CHUNK_SIZE, MAX_CONCURRENT_CHUNKS, DEFAULT_BANDWIDTH_CAP } from '$lib/constants';
import { TransferState } from '$lib/types/enums';
import { getCurrentDEK } from '$lib/security/auth.service';
import { encryptBinary, uint8ArrayToBase64 } from '$lib/security/crypto';
import type { FileChunk, TransferSession, BandwidthConfig } from '$lib/types/files';

const chunkRepo = new ChunkRepository();
const transferRepo = new TransferSessionRepository();
const logger = createLogger('files');

export class ChunkScheduler {
  private activeCount = 0;
  private bandwidthCap: number = DEFAULT_BANDWIDTH_CAP;
  private isPaused = false;
  private lastChunkTime = 0;

  setBandwidthCap(bytesPerSecond: number): void {
    if (bytesPerSecond <= 0) {
      throw new ValidationServiceError('Invalid bandwidth cap', [
        { field: 'bandwidthCap', message: 'Must be greater than 0', code: 'invalid_bandwidth' },
      ]);
    }
    this.bandwidthCap = bytesPerSecond;
  }

  getBandwidthCap(): number {
    return this.bandwidthCap;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  async scheduleChunks(
    sessionId: string,
    fileData: ArrayBuffer,
    onProgress?: (completed: number, total: number) => void,
    versionId?: string,
  ): Promise<void> {
    const session = await transferRepo.getById(sessionId);
    if (!session) throw new ValidationServiceError('Session not found', [
      { field: 'sessionId', message: 'Not found', code: 'not_found' },
    ]);

    // Set session to active
    await transferRepo.put({
      ...session,
      status: TransferState.Active,
      updatedAt: new Date().toISOString(),
    });

    const totalChunks = session.totalChunks;
    // When a versionId is provided, scope deduplication to that version's chunks only.
    // This prevents prior version chunks from falsely marking indices as complete.
    const existingChunks = versionId
      ? await chunkRepo.getByVersion(versionId)
      : await chunkRepo.getByFile(session.fileId);
    const completedIndices = new Set(existingChunks.map(c => c.chunkIndex));

    const pendingIndices: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!completedIndices.has(i)) {
        pendingIndices.push(i);
      }
    }

    // Process chunks with concurrency limit
    let completed = existingChunks.length;

    const processNext = async (index: number): Promise<void> => {
      if (this.isPaused) return;

      // Throttle based on bandwidth cap
      await this.throttle();

      this.activeCount++;
      try {
        const start = index * FILE_CHUNK_SIZE;
        const end = Math.min(start + FILE_CHUNK_SIZE, fileData.byteLength);
        const chunkData = fileData.slice(start, end);

        const isFinal = index === totalChunks - 1;
        const sizeValidation = validateChunkSize(chunkData.byteLength, isFinal);
        if (!sizeValidation.valid) {
          throw new ValidationServiceError('Invalid chunk', sizeValidation.errors);
        }

        await this.processChunk(session.fileId, index, chunkData, versionId);
        completed++;

        // Update session progress
        const currentSession = await transferRepo.getById(sessionId);
        if (currentSession) {
          await transferRepo.put({
            ...currentSession,
            completedChunks: completed,
            updatedAt: new Date().toISOString(),
          });
        }

        onProgress?.(completed, totalChunks);
      } finally {
        this.activeCount--;
      }
    };

    // Promise pool: process up to MAX_CONCURRENT_CHUNKS at a time
    const pool: Set<Promise<void>> = new Set();
    for (const index of pendingIndices) {
      if (this.isPaused) break;

      const promise = processNext(index).then(
        () => { pool.delete(promise); },
        () => { pool.delete(promise); },
      );
      pool.add(promise);

      if (pool.size >= MAX_CONCURRENT_CHUNKS) {
        await Promise.race(pool);
      }
    }

    // Wait for remaining
    await Promise.all(pool);

    logger.info('Chunk scheduling complete', { sessionId, completed, totalChunks });
  }

  async processChunk(
    fileId: string,
    chunkIndex: number,
    data: ArrayBuffer,
    versionId?: string,
  ): Promise<FileChunk> {
    const now = new Date().toISOString();

    // Encrypt chunk data with the user's DEK if available
    let storedData: ArrayBuffer = data;
    let iv: string | undefined;

    const dek = getCurrentDEK();
    if (dek) {
      const encrypted = await encryptBinary(data, dek);
      storedData = encrypted.ciphertext;
      iv = uint8ArrayToBase64(encrypted.iv);
    }

    const chunk: FileChunk = {
      id: crypto.randomUUID(),
      fileId,
      chunkIndex,
      data: storedData,
      size: data.byteLength,
      iv,
      versionId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    await chunkRepo.add(chunk);
    return chunk;
  }

  pause(): void {
    this.isPaused = true;
    logger.info('Chunk scheduler paused');
  }

  resume(): void {
    this.isPaused = false;
    logger.info('Chunk scheduler resumed');
  }

  private async throttle(): Promise<void> {
    if (this.bandwidthCap <= 0) return;

    const chunkBytes = FILE_CHUNK_SIZE;
    const minIntervalMs = (chunkBytes / this.bandwidthCap) * 1000;
    const elapsed = Date.now() - this.lastChunkTime;

    if (elapsed < minIntervalMs && this.lastChunkTime > 0) {
      const delay = minIntervalMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastChunkTime = Date.now();
  }
}
