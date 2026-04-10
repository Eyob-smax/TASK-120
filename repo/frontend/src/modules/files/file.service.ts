import { FileRepository, TransferSessionRepository, ChunkRepository } from '$lib/db';
import { validateFileIngest } from '$lib/validators';
import { ValidationServiceError } from '$lib/services/errors';
import { createLogger } from '$lib/logging';
import { arrayBufferToBase64 } from '$lib/security/crypto';
import { getCurrentDEK } from '$lib/security/auth.service';
import { FILE_CHUNK_SIZE } from '$lib/constants';
import { TransferState } from '$lib/types/enums';
import type { FileRecord, TransferSession } from '$lib/types/files';

const fileRepo = new FileRepository();
const transferRepo = new TransferSessionRepository();
const chunkRepo = new ChunkRepository();
const logger = createLogger('files');

export async function computeHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkDedup(sha256: string): Promise<{ exists: boolean; fileId?: string }> {
  const existing = await fileRepo.getByHash(sha256);
  const active = existing.find(f => !f.isDeleted);
  if (active) {
    return { exists: true, fileId: active.id };
  }
  return { exists: false };
}

export async function ingestFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  fileData: ArrayBuffer,
  createdBy: string,
): Promise<{ file: FileRecord; session: TransferSession | null; deduplicated: boolean }> {
  const validation = validateFileIngest({ name: fileName, size: fileSize, type: mimeType });
  if (!validation.valid) throw new ValidationServiceError('Invalid file', validation.errors);

  const sha256 = await computeHash(fileData);

  // Check deduplication
  const dedup = await checkDedup(sha256);
  if (dedup.exists && dedup.fileId) {
    const existingFile = await fileRepo.getById(dedup.fileId);
    if (existingFile) {
      logger.info('File deduplicated', { fileName, sha256 });
      return { file: existingFile, session: null, deduplicated: true };
    }
  }

  const now = new Date().toISOString();
  const fileId = crypto.randomUUID();

  const fileRecord: FileRecord = {
    id: fileId,
    name: fileName,
    mimeType,
    size: fileSize,
    sha256,
    currentVersionId: '',
    createdBy,
    isDeleted: false,
    encryptedWithDEK: getCurrentDEK() !== null,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await fileRepo.add(fileRecord);

  // Create transfer session
  const totalChunks = Math.ceil(fileSize / FILE_CHUNK_SIZE);
  const session = await createTransferSession(fileId, fileSize, totalChunks);

  logger.info('File ingestion started', { fileId, fileName, totalChunks, sha256 });
  return { file: fileRecord, session, deduplicated: false };
}

export async function createTransferSession(
  fileId: string,
  fileSize: number,
  totalChunks?: number,
): Promise<TransferSession> {
  const chunks = totalChunks ?? Math.ceil(fileSize / FILE_CHUNK_SIZE);
  const now = new Date().toISOString();

  const session: TransferSession = {
    id: crypto.randomUUID(),
    fileId,
    status: TransferState.Pending,
    totalChunks: chunks,
    completedChunks: 0,
    chunkSize: FILE_CHUNK_SIZE,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await transferRepo.add(session);
  return session;
}

export async function pauseTransfer(sessionId: string): Promise<TransferSession> {
  const session = await transferRepo.getById(sessionId);
  if (!session) throw new ValidationServiceError('Session not found', [
    { field: 'sessionId', message: 'Transfer session not found', code: 'not_found' },
  ]);

  if (session.status !== TransferState.Active) {
    throw new ValidationServiceError('Cannot pause non-active transfer', [
      { field: 'status', message: `Transfer is ${session.status}`, code: 'invalid_state' },
    ]);
  }

  return transferRepo.put({
    ...session,
    status: TransferState.Paused,
    updatedAt: new Date().toISOString(),
  });
}

export async function resumeTransfer(sessionId: string): Promise<TransferSession> {
  const session = await transferRepo.getById(sessionId);
  if (!session) throw new ValidationServiceError('Session not found', [
    { field: 'sessionId', message: 'Transfer session not found', code: 'not_found' },
  ]);

  if (session.status !== TransferState.Paused) {
    throw new ValidationServiceError('Cannot resume non-paused transfer', [
      { field: 'status', message: `Transfer is ${session.status}`, code: 'invalid_state' },
    ]);
  }

  return transferRepo.put({
    ...session,
    status: TransferState.Active,
    updatedAt: new Date().toISOString(),
  });
}

export async function completeTransfer(sessionId: string): Promise<TransferSession> {
  const session = await transferRepo.getById(sessionId);
  if (!session) throw new ValidationServiceError('Session not found', [
    { field: 'sessionId', message: 'Transfer session not found', code: 'not_found' },
  ]);

  if (session.completedChunks < session.totalChunks) {
    throw new ValidationServiceError('Transfer incomplete', [
      {
        field: 'chunks',
        message: `${session.completedChunks}/${session.totalChunks} chunks completed`,
        code: 'incomplete',
      },
    ]);
  }

  return transferRepo.put({
    ...session,
    status: TransferState.Completed,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFile(fileId: string): Promise<FileRecord | undefined> {
  return fileRepo.getById(fileId);
}

export async function getFiles(): Promise<FileRecord[]> {
  return fileRepo.getAll();
}

export async function getTransferSession(sessionId: string): Promise<TransferSession | undefined> {
  return transferRepo.getById(sessionId);
}

export async function uploadNewVersion(
  fileId: string,
  fileData: ArrayBuffer,
  userId: string,
): Promise<{ file: FileRecord; session: TransferSession | null; deduplicated: boolean }> {
  const file = await fileRepo.getById(fileId);
  if (!file) {
    throw new ValidationServiceError('File not found', [
      { field: 'fileId', message: 'File does not exist', code: 'not_found' },
    ]);
  }
  if (file.isDeleted) {
    throw new ValidationServiceError('File is deleted', [
      { field: 'fileId', message: 'Cannot version a deleted file', code: 'deleted' },
    ]);
  }

  const sha256 = await computeHash(fileData);

  // Same content as current version — skip
  if (sha256 === file.sha256) {
    logger.info('New version skipped (same hash)', { fileId, sha256 });
    return { file, session: null, deduplicated: true };
  }

  // Create transfer session for the new version's chunks
  const totalChunks = Math.ceil(fileData.byteLength / FILE_CHUNK_SIZE);
  const session = await createTransferSession(fileId, fileData.byteLength, totalChunks);

  // Update file record with new hash and size
  const now = new Date().toISOString();
  const updatedFile = await fileRepo.put({
    ...file,
    sha256,
    size: fileData.byteLength,
    encryptedWithDEK: getCurrentDEK() !== null,
    updatedAt: now,
  });

  logger.info('New version upload started', { fileId, sha256, totalChunks });
  return { file: updatedFile, session, deduplicated: false };
}
