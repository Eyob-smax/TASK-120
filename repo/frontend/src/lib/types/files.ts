import type { BaseEntity } from './common';
import type { TransferState } from './enums';

export interface FileRecord extends BaseEntity {
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  currentVersionId: string;
  createdBy: string;
  isDeleted: boolean;
  encryptedWithDEK?: boolean;
}

export interface FileChunk extends BaseEntity {
  fileId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  size: number;
  iv?: string;
  versionId?: string;
}

export interface TransferSession extends BaseEntity {
  fileId: string;
  status: TransferState;
  totalChunks: number;
  completedChunks: number;
  chunkSize: number;
  startedAt: string;
}

export interface ChunkManifest {
  sessionId: string;
  totalChunks: number;
  chunkSize: number;
  completedIndices: number[];
  failedIndices: number[];
}

export interface FileVersion extends BaseEntity {
  fileId: string;
  versionNumber: number;
  sha256: string;
  size: number;
  createdBy: string;
}

export interface RecycleBinEntry extends BaseEntity {
  fileId: string;
  originalName: string;
  deletedBy: string;
  deletedAt: string;
  expiresAt: string;
}

export interface BandwidthConfig {
  capBytesPerSecond: number;
  updatedAt: string;
}
