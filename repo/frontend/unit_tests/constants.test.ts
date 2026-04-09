import { describe, it, expect } from 'vitest';
import {
  SAFETY_STOCK_DEFAULT,
  RESERVATION_TIMEOUT_MS,
  WAVE_DEFAULT_SIZE,
  FILE_CHUNK_SIZE,
  MAX_CONCURRENT_CHUNKS,
  DEFAULT_BANDWIDTH_CAP,
  MAX_FILE_VERSIONS,
  RECYCLE_BIN_RETENTION_DAYS,
  RECYCLE_BIN_RETENTION_MS,
  NOTIFICATION_RETRY_DELAYS,
  MAX_NOTIFICATION_RETRIES,
  IDLE_LOCK_TIMEOUT_MS,
  SEARCH_HISTORY_CAP,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_LENGTH,
  AES_KEY_LENGTH,
  AES_IV_LENGTH,
  MIN_CAPTURE_WIDTH,
  MIN_CAPTURE_HEIGHT,
  BRIGHTNESS_RANGE,
  OCCLUSION_THRESHOLD,
  LIVENESS_FRAME_COUNT,
  LIVENESS_DURATION_MS,
  LOCAL_STORAGE_PREFIX,
} from '../src/lib/constants';

describe('Application Constants', () => {
  it('safety stock defaults to 20 units per SKU per warehouse', () => {
    expect(SAFETY_STOCK_DEFAULT).toBe(20);
  });

  it('reservation auto-release after 30 minutes', () => {
    expect(RESERVATION_TIMEOUT_MS).toBe(30 * 60 * 1000);
    expect(RESERVATION_TIMEOUT_MS).toBe(1_800_000);
  });

  it('wave default size is 25 lines', () => {
    expect(WAVE_DEFAULT_SIZE).toBe(25);
  });

  it('file chunks are 10 MB', () => {
    expect(FILE_CHUNK_SIZE).toBe(10 * 1024 * 1024);
    expect(FILE_CHUNK_SIZE).toBe(10_485_760);
  });

  it('max 3 concurrent chunks', () => {
    expect(MAX_CONCURRENT_CHUNKS).toBe(3);
  });

  it('default bandwidth cap is 5 MB/s', () => {
    expect(DEFAULT_BANDWIDTH_CAP).toBe(5 * 1024 * 1024);
    expect(DEFAULT_BANDWIDTH_CAP).toBe(5_242_880);
  });

  it('retain last 10 file versions', () => {
    expect(MAX_FILE_VERSIONS).toBe(10);
  });

  it('recycle bin retention is 30 days', () => {
    expect(RECYCLE_BIN_RETENTION_DAYS).toBe(30);
    expect(RECYCLE_BIN_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(RECYCLE_BIN_RETENTION_MS).toBe(RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  });

  it('notification retries at 1, 5, and 15 minutes', () => {
    expect(NOTIFICATION_RETRY_DELAYS).toEqual([60_000, 300_000, 900_000]);
    expect(NOTIFICATION_RETRY_DELAYS).toHaveLength(3);
  });

  it('max 3 notification retries', () => {
    expect(MAX_NOTIFICATION_RETRIES).toBe(3);
  });

  it('idle lock after 10 minutes', () => {
    expect(IDLE_LOCK_TIMEOUT_MS).toBe(10 * 60 * 1000);
    expect(IDLE_LOCK_TIMEOUT_MS).toBe(600_000);
  });

  it('search history capped at 50 entries', () => {
    expect(SEARCH_HISTORY_CAP).toBe(50);
  });

  it('PBKDF2 uses 600,000 iterations', () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
  });

  it('PBKDF2 salt is 16 bytes (128 bits)', () => {
    expect(PBKDF2_SALT_LENGTH).toBe(16);
  });

  it('AES key length is 256 bits', () => {
    expect(AES_KEY_LENGTH).toBe(256);
  });

  it('AES IV length is 12 bytes (96 bits)', () => {
    expect(AES_IV_LENGTH).toBe(12);
  });

  it('minimum capture resolution is 1280x720', () => {
    expect(MIN_CAPTURE_WIDTH).toBe(1280);
    expect(MIN_CAPTURE_HEIGHT).toBe(720);
  });

  it('brightness range is 40-220', () => {
    expect(BRIGHTNESS_RANGE.min).toBe(40);
    expect(BRIGHTNESS_RANGE.max).toBe(220);
  });

  it('occlusion threshold is 0.7', () => {
    expect(OCCLUSION_THRESHOLD).toBe(0.7);
  });

  it('liveness requires 5 frames over 3 seconds', () => {
    expect(LIVENESS_FRAME_COUNT).toBe(5);
    expect(LIVENESS_DURATION_MS).toBe(3_000);
  });

  it('LocalStorage prefix is forgeops:', () => {
    expect(LOCAL_STORAGE_PREFIX).toBe('forgeops:');
  });
});
