import { describe, it, expect } from 'vitest';
import {
  validateFileIngest,
  validateChunkSize,
  validateBandwidthCap,
  validateVersionRetention,
  isRecycleBinExpired,
} from '../../src/lib/validators/files.validators';
import { FILE_CHUNK_SIZE, RECYCLE_BIN_RETENTION_MS } from '../../src/lib/constants';

describe('File Validators', () => {
  describe('validateFileIngest', () => {
    it('accepts a valid file', () => {
      const result = validateFileIngest({ name: 'doc.pdf', size: 1024, type: 'application/pdf' });
      expect(result.valid).toBe(true);
    });

    it('rejects empty name', () => {
      const result = validateFileIngest({ name: '', size: 1024, type: 'text/plain' });
      expect(result.valid).toBe(false);
    });

    it('rejects zero size', () => {
      const result = validateFileIngest({ name: 'file.txt', size: 0, type: 'text/plain' });
      expect(result.valid).toBe(false);
    });

    it('rejects negative size', () => {
      const result = validateFileIngest({ name: 'file.txt', size: -100, type: 'text/plain' });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChunkSize', () => {
    it('accepts exactly 10 MB for non-final chunk', () => {
      const result = validateChunkSize(FILE_CHUNK_SIZE);
      expect(result.valid).toBe(true);
    });

    it('rejects chunk over 10 MB for non-final', () => {
      const result = validateChunkSize(FILE_CHUNK_SIZE + 1);
      expect(result.valid).toBe(false);
    });

    it('rejects chunk under 10 MB for non-final', () => {
      const result = validateChunkSize(FILE_CHUNK_SIZE - 1);
      expect(result.valid).toBe(false);
    });

    it('accepts smaller final chunk', () => {
      const result = validateChunkSize(5_000_000, true);
      expect(result.valid).toBe(true);
    });

    it('accepts full-size final chunk', () => {
      const result = validateChunkSize(FILE_CHUNK_SIZE, true);
      expect(result.valid).toBe(true);
    });

    it('rejects zero-size final chunk', () => {
      const result = validateChunkSize(0, true);
      expect(result.valid).toBe(false);
    });

    it('rejects final chunk over 10 MB', () => {
      const result = validateChunkSize(FILE_CHUNK_SIZE + 1, true);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateBandwidthCap', () => {
    it('accepts positive value', () => {
      expect(validateBandwidthCap(5_242_880).valid).toBe(true);
    });

    it('rejects zero', () => {
      expect(validateBandwidthCap(0).valid).toBe(false);
    });

    it('rejects negative', () => {
      expect(validateBandwidthCap(-1000).valid).toBe(false);
    });
  });

  describe('validateVersionRetention', () => {
    it('accepts 10 versions', () => {
      expect(validateVersionRetention(10).valid).toBe(true);
    });

    it('flags 11 versions as exceeding maximum', () => {
      const result = validateVersionRetention(11);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'exceeds_max_versions')).toBe(true);
    });

    it('accepts fewer than 10', () => {
      expect(validateVersionRetention(5).valid).toBe(true);
    });
  });

  describe('isRecycleBinExpired', () => {
    it('returns true for entry deleted 31 days ago', () => {
      const thirtyOneDaysAgo = new Date(Date.now() - RECYCLE_BIN_RETENTION_MS - 86_400_000).toISOString();
      expect(isRecycleBinExpired(thirtyOneDaysAgo)).toBe(true);
    });

    it('returns false for entry deleted 29 days ago', () => {
      const twentyNineDaysAgo = new Date(Date.now() - RECYCLE_BIN_RETENTION_MS + 86_400_000).toISOString();
      expect(isRecycleBinExpired(twentyNineDaysAgo)).toBe(false);
    });

    it('returns false at exactly 30 days', () => {
      const now = new Date('2025-01-31T00:00:00.000Z');
      const deletedAt = '2025-01-01T00:00:00.000Z';
      expect(isRecycleBinExpired(deletedAt, now)).toBe(false);
    });

    it('returns true at 30 days + 1ms', () => {
      const now = new Date('2025-01-31T00:00:00.001Z');
      const deletedAt = '2025-01-01T00:00:00.000Z';
      expect(isRecycleBinExpired(deletedAt, now)).toBe(true);
    });
  });
});
