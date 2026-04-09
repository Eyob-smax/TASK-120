import type { ValidationResult, ValidationError } from '$lib/types/common';
import {
  FILE_CHUNK_SIZE,
  MAX_FILE_VERSIONS,
  RECYCLE_BIN_RETENTION_MS,
} from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateFileIngest(
  file: { name: string; size: number; type: string },
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!file.name || file.name.trim().length === 0) {
    errors.push(err('name', 'File name is required', 'required'));
  }
  if (file.size <= 0) {
    errors.push(err('size', 'File size must be greater than zero', 'invalid_size'));
  }

  return makeResult(errors);
}

export function validateChunkSize(size: number, isFinalChunk = false): ValidationResult {
  const errors: ValidationError[] = [];

  if (isFinalChunk) {
    if (size <= 0 || size > FILE_CHUNK_SIZE) {
      errors.push(err('size', `Final chunk must be between 1 and ${FILE_CHUNK_SIZE} bytes`, 'invalid_chunk_size'));
    }
  } else {
    if (size !== FILE_CHUNK_SIZE) {
      errors.push(err('size', `Chunk size must be exactly ${FILE_CHUNK_SIZE} bytes`, 'invalid_chunk_size'));
    }
  }

  return makeResult(errors);
}

export function validateBandwidthCap(bytesPerSecond: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (bytesPerSecond <= 0) {
    errors.push(err('capBytesPerSecond', 'Bandwidth cap must be greater than zero', 'invalid_bandwidth'));
  }

  return makeResult(errors);
}

export function validateVersionRetention(versionCount: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (versionCount > MAX_FILE_VERSIONS) {
    errors.push(err(
      'versionCount',
      `Version count ${versionCount} exceeds maximum of ${MAX_FILE_VERSIONS}`,
      'exceeds_max_versions',
    ));
  }

  return makeResult(errors);
}

export function isRecycleBinExpired(
  deletedAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() - new Date(deletedAt).getTime() > RECYCLE_BIN_RETENTION_MS;
}
