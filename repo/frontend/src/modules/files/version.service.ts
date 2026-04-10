import { VersionRepository, FileRepository } from '$lib/db';
import { ValidationServiceError } from '$lib/services/errors';
import { createLogger } from '$lib/logging';
import { enforceVersionLimit } from './retention';
import { NotificationType } from '$lib/types/enums';
import { dispatchNotification } from '$modules/notifications/notification.service';
import type { FileVersion } from '$lib/types/files';

const versionRepo = new VersionRepository();
const fileRepo = new FileRepository();
const logger = createLogger('files');

export async function createVersion(
  fileId: string,
  sha256: string,
  size: number,
  createdBy: string,
): Promise<{ version: FileVersion; removed: FileVersion[] }> {
  const existing = await versionRepo.getByFile(fileId);
  const maxVersion = existing.reduce((max, v) => Math.max(max, v.versionNumber), 0);

  const now = new Date().toISOString();
  const newVersion: FileVersion = {
    id: crypto.randomUUID(),
    fileId,
    versionNumber: maxVersion + 1,
    sha256,
    size,
    createdBy,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await versionRepo.add(newVersion);

  // Update file's current version
  const file = await fileRepo.getById(fileId);
  if (file) {
    await fileRepo.put({
      ...file,
      currentVersionId: newVersion.id,
      updatedAt: now,
    });
  }

  // Enforce retention limit
  const allVersions = await versionRepo.getByFile(fileId);
  const { remove } = enforceVersionLimit(allVersions);

  for (const old of remove) {
    await versionRepo.delete(old.id);
  }

  logger.info('Version created', {
    fileId,
    versionNumber: newVersion.versionNumber,
    removedCount: remove.length,
  });

  return { version: newVersion, removed: remove };
}

export async function rollbackToVersion(
  fileId: string,
  targetVersionId: string,
  createdBy: string,
): Promise<FileVersion> {
  const targetVersion = await versionRepo.getById(targetVersionId);
  if (!targetVersion) {
    throw new ValidationServiceError('Version not found', [
      { field: 'targetVersionId', message: 'Target version does not exist', code: 'not_found' },
    ]);
  }

  if (targetVersion.fileId !== fileId) {
    throw new ValidationServiceError('Version mismatch', [
      { field: 'fileId', message: 'Version does not belong to this file', code: 'mismatch' },
    ]);
  }

  // Point the file record directly at the target version so its existing chunks
  // are served by preview. Creating a new version record would produce a UUID
  // with no chunks, making the preview return empty after rollback.
  const file = await fileRepo.getById(fileId);
  if (file) {
    await fileRepo.put({
      ...file,
      currentVersionId: targetVersionId,
      updatedAt: new Date().toISOString(),
    });
  }

  logger.info('Version rolled back', {
    fileId,
    toVersion: targetVersion.versionNumber,
  });

  try {
    await dispatchNotification(createdBy, NotificationType.FileVersionRollback, 'File Version Rolled Back',
      `File rolled back to version ${targetVersion.versionNumber}`,
      { fileId, toVersion: targetVersion.versionNumber });
  } catch { /* notification failure should not block rollback */ }

  return targetVersion;
}

export async function getVersionHistory(fileId: string): Promise<FileVersion[]> {
  const versions = await versionRepo.getByFile(fileId);
  return versions.sort((a, b) => b.versionNumber - a.versionNumber);
}
