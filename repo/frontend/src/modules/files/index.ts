/**
 * File Management Module
 *
 * Chunked and resumable file transfers (10 MB chunks, max 3 concurrent,
 * user-set bandwidth cap), SHA-256 deduplication for instant upload,
 * versioning with rollback (retain last 10 versions), recycle bin
 * with 30-day retention, and local preview.
 */

// Pure logic
export { enforceVersionLimit, isRecycleBinExpired, getExpiredRecycleBinEntries } from './retention';

// File service
export {
  computeHash,
  checkDedup,
  ingestFile,
  createTransferSession,
  pauseTransfer,
  resumeTransfer,
  completeTransfer,
  getFile,
  getFiles,
  getTransferSession,
} from './file.service';

// Chunk scheduler
export { ChunkScheduler } from './chunk-scheduler';

// Version service
export {
  createVersion,
  rollbackToVersion,
  getVersionHistory,
} from './version.service';

// Recycle bin service
export {
  deleteFile,
  restoreFile,
  purgeExpired,
  getRecycleBinContents,
} from './recycle-bin.service';

// Stores
export {
  fileStore,
  transferStore,
  recycleBinStore,
  loadFiles,
  loadTransfers,
} from './file.store';

// Preview
export { getPreviewType, canPreview, createPreviewUrl, revokePreviewUrl } from './preview.service';
