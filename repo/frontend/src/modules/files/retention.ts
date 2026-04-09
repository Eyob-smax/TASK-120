import type { FileVersion, RecycleBinEntry } from '$lib/types/files';
import { MAX_FILE_VERSIONS, RECYCLE_BIN_RETENTION_MS } from '$lib/constants';

export function enforceVersionLimit(
  versions: FileVersion[],
  limit: number = MAX_FILE_VERSIONS,
): { keep: FileVersion[]; remove: FileVersion[] } {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return {
    keep: sorted.slice(0, limit),
    remove: sorted.slice(limit),
  };
}

export function isRecycleBinExpired(
  deletedAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() - new Date(deletedAt).getTime() > RECYCLE_BIN_RETENTION_MS;
}

export function getExpiredRecycleBinEntries(
  entries: RecycleBinEntry[],
  now: Date = new Date(),
): RecycleBinEntry[] {
  return entries.filter(e => isRecycleBinExpired(e.deletedAt, now));
}
