import { FileRepository, RecycleBinRepository, ChunkRepository } from '$lib/db';
import { ValidationServiceError } from '$lib/services/errors';
import { createLogger } from '$lib/logging';
import { getExpiredRecycleBinEntries } from './retention';
import { RECYCLE_BIN_RETENTION_MS } from '$lib/constants';
import type { FileRecord, RecycleBinEntry } from '$lib/types/files';

const fileRepo = new FileRepository();
const recycleBinRepo = new RecycleBinRepository();
const chunkRepo = new ChunkRepository();
const logger = createLogger('files');

export async function deleteFile(
  fileId: string,
  deletedBy: string,
): Promise<RecycleBinEntry> {
  const file = await fileRepo.getById(fileId);
  if (!file) throw new ValidationServiceError('File not found', [
    { field: 'fileId', message: 'File does not exist', code: 'not_found' },
  ]);

  if (file.isDeleted) {
    throw new ValidationServiceError('File already deleted', [
      { field: 'fileId', message: 'File is already in recycle bin', code: 'already_deleted' },
    ]);
  }

  const now = new Date().toISOString();

  // Soft delete the file
  await fileRepo.put({
    ...file,
    isDeleted: true,
    updatedAt: now,
  });

  // Create recycle bin entry
  const entry: RecycleBinEntry = {
    id: crypto.randomUUID(),
    fileId,
    originalName: file.name,
    deletedBy,
    deletedAt: now,
    expiresAt: new Date(new Date(now).getTime() + RECYCLE_BIN_RETENTION_MS).toISOString(),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await recycleBinRepo.add(entry);
  logger.info('File moved to recycle bin', { fileId, originalName: file.name });
  return entry;
}

export async function restoreFile(entryId: string): Promise<FileRecord> {
  const entry = await recycleBinRepo.getById(entryId);
  if (!entry) throw new ValidationServiceError('Recycle bin entry not found', [
    { field: 'entryId', message: 'Entry does not exist', code: 'not_found' },
  ]);

  const file = await fileRepo.getById(entry.fileId);
  if (!file) throw new ValidationServiceError('File record not found', [
    { field: 'fileId', message: 'Original file record missing', code: 'not_found' },
  ]);

  const now = new Date().toISOString();

  // Restore the file
  const restored = await fileRepo.put({
    ...file,
    isDeleted: false,
    updatedAt: now,
  });

  // Remove recycle bin entry
  await recycleBinRepo.delete(entryId);

  logger.info('File restored from recycle bin', { fileId: entry.fileId });
  return restored;
}

export async function purgeExpired(now: Date = new Date()): Promise<number> {
  const allEntries = await recycleBinRepo.getAll();
  const expired = getExpiredRecycleBinEntries(allEntries, now);

  for (const entry of expired) {
    // Delete chunks
    const chunks = await chunkRepo.getByFile(entry.fileId);
    for (const chunk of chunks) {
      await chunkRepo.delete(chunk.id);
    }

    // Delete file record
    await fileRepo.delete(entry.fileId);

    // Delete recycle bin entry
    await recycleBinRepo.delete(entry.id);
  }

  if (expired.length > 0) {
    logger.info('Purged expired recycle bin entries', { count: expired.length });
  }
  return expired.length;
}

export async function getRecycleBinContents(): Promise<RecycleBinEntry[]> {
  return recycleBinRepo.getAll();
}
