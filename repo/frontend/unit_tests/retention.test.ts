import { describe, it, expect } from 'vitest';
import {
  enforceVersionLimit,
  isRecycleBinExpired,
  getExpiredRecycleBinEntries,
} from '../src/modules/files/retention';
import type { FileVersion, RecycleBinEntry } from '../src/lib/types/files';
import { RECYCLE_BIN_RETENTION_MS } from '../src/lib/constants';

function makeVersion(num: number): FileVersion {
  return {
    id: `v-${num}`,
    fileId: 'file-1',
    versionNumber: num,
    sha256: `hash-${num}`,
    size: 1024 * num,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

function makeRecycleEntry(deletedDaysAgo: number, id = 'rb-1'): RecycleBinEntry {
  const deletedAt = new Date(Date.now() - deletedDaysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id,
    fileId: 'file-1',
    originalName: 'test.txt',
    deletedBy: 'user-1',
    deletedAt,
    expiresAt: new Date(new Date(deletedAt).getTime() + RECYCLE_BIN_RETENTION_MS).toISOString(),
    createdAt: deletedAt,
    updatedAt: deletedAt,
    version: 1,
  };
}

describe('File Retention', () => {
  describe('enforceVersionLimit', () => {
    it('keeps all when count equals limit', () => {
      const versions = Array.from({ length: 10 }, (_, i) => makeVersion(i + 1));
      const { keep, remove } = enforceVersionLimit(versions);
      expect(keep).toHaveLength(10);
      expect(remove).toHaveLength(0);
    });

    it('removes oldest when exceeding limit', () => {
      const versions = Array.from({ length: 11 }, (_, i) => makeVersion(i + 1));
      const { keep, remove } = enforceVersionLimit(versions);
      expect(keep).toHaveLength(10);
      expect(remove).toHaveLength(1);
      // The removed version should be the lowest number (oldest)
      expect(remove[0].versionNumber).toBe(1);
    });

    it('keeps all when count is under limit', () => {
      const versions = Array.from({ length: 5 }, (_, i) => makeVersion(i + 1));
      const { keep, remove } = enforceVersionLimit(versions);
      expect(keep).toHaveLength(5);
      expect(remove).toHaveLength(0);
    });

    it('keeps highest version numbers', () => {
      const versions = Array.from({ length: 12 }, (_, i) => makeVersion(i + 1));
      const { keep } = enforceVersionLimit(versions);
      const keptNumbers = keep.map(v => v.versionNumber);
      expect(keptNumbers).toContain(12);
      expect(keptNumbers).toContain(11);
      expect(keptNumbers).not.toContain(1);
      expect(keptNumbers).not.toContain(2);
    });

    it('accepts custom limit', () => {
      const versions = Array.from({ length: 5 }, (_, i) => makeVersion(i + 1));
      const { keep, remove } = enforceVersionLimit(versions, 3);
      expect(keep).toHaveLength(3);
      expect(remove).toHaveLength(2);
    });
  });

  describe('isRecycleBinExpired', () => {
    it('returns true for entry deleted 31 days ago', () => {
      const entry = makeRecycleEntry(31);
      expect(isRecycleBinExpired(entry.deletedAt)).toBe(true);
    });

    it('returns false for entry deleted 29 days ago', () => {
      const entry = makeRecycleEntry(29);
      expect(isRecycleBinExpired(entry.deletedAt)).toBe(false);
    });

    it('handles exact 30-day boundary correctly', () => {
      const now = new Date('2025-02-01T00:00:00.000Z');
      const deletedAt = '2025-01-02T00:00:00.000Z';
      // 30 days exactly = not expired (requires > not >=)
      expect(isRecycleBinExpired(deletedAt, now)).toBe(false);
    });
  });

  describe('getExpiredRecycleBinEntries', () => {
    it('filters expired entries from mixed list', () => {
      const entries = [
        makeRecycleEntry(31, 'expired-1'),
        makeRecycleEntry(15, 'fresh-1'),
        makeRecycleEntry(35, 'expired-2'),
        makeRecycleEntry(5, 'fresh-2'),
      ];
      const expired = getExpiredRecycleBinEntries(entries);
      expect(expired).toHaveLength(2);
      expect(expired.map(e => e.id)).toContain('expired-1');
      expect(expired.map(e => e.id)).toContain('expired-2');
    });

    it('returns empty for all-fresh entries', () => {
      const entries = [makeRecycleEntry(10, 'a'), makeRecycleEntry(20, 'b')];
      expect(getExpiredRecycleBinEntries(entries)).toHaveLength(0);
    });
  });
});
