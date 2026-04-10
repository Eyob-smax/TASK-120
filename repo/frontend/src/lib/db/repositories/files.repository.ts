import { Repository } from '../repository';
import { STORE_NAMES } from '../schema';
import { RECYCLE_BIN_RETENTION_MS } from '$lib/constants';
import type { FileRecord, FileChunk, TransferSession, FileVersion, RecycleBinEntry } from '$lib/types/files';
import type { TransferState } from '$lib/types/enums';

export class FileRepository extends Repository<FileRecord> {
  constructor() {
    super(STORE_NAMES.FILES);
  }

  async getByHash(sha256: string): Promise<FileRecord[]> {
    return this.getByIndex('sha256', sha256);
  }

  async getActive(): Promise<FileRecord[]> {
    return this.getByIndex('isDeleted', 0 as unknown as IDBValidKey);
  }

  async getDeleted(): Promise<FileRecord[]> {
    return this.getByIndex('isDeleted', 1 as unknown as IDBValidKey);
  }

  async getByCreator(createdBy: string): Promise<FileRecord[]> {
    return this.getByIndex('createdBy', createdBy);
  }
}

export class ChunkRepository extends Repository<FileChunk> {
  constructor() {
    super(STORE_NAMES.CHUNKS);
  }

  async getByFile(fileId: string): Promise<FileChunk[]> {
    return this.getByIndex('fileId', fileId);
  }

  async getByVersion(versionId: string): Promise<FileChunk[]> {
    return this.getByIndex('versionId', versionId);
  }
}

export class TransferSessionRepository extends Repository<TransferSession> {
  constructor() {
    super(STORE_NAMES.TRANSFER_SESSIONS);
  }

  async getByStatus(status: TransferState): Promise<TransferSession[]> {
    return this.getByIndex('status', status);
  }

  async getByFile(fileId: string): Promise<TransferSession[]> {
    return this.getByIndex('fileId', fileId);
  }
}

export class VersionRepository extends Repository<FileVersion> {
  constructor() {
    super(STORE_NAMES.VERSIONS);
  }

  async getByFile(fileId: string): Promise<FileVersion[]> {
    return this.getByIndex('fileId', fileId);
  }

  async getLatest(fileId: string, limit: number): Promise<FileVersion[]> {
    const versions = await this.getByFile(fileId);
    return versions
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .slice(0, limit);
  }
}

export class RecycleBinRepository extends Repository<RecycleBinEntry> {
  constructor() {
    super(STORE_NAMES.RECYCLE_BIN);
  }

  async getByFile(fileId: string): Promise<RecycleBinEntry[]> {
    return this.getByIndex('fileId', fileId);
  }

  async getExpired(now: Date = new Date()): Promise<RecycleBinEntry[]> {
    const all = await this.getAll();
    return all.filter(
      entry => now.getTime() - new Date(entry.deletedAt).getTime() > RECYCLE_BIN_RETENTION_MS,
    );
  }
}
