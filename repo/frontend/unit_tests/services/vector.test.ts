import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  generateVector,
  encryptAndStore,
  getVectorByProfile,
} from '../../src/modules/identity/vector.service';
import { generateDataKey } from '../../src/lib/security/crypto';

const hasWebCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

let dek: CryptoKey | null = null;
vi.mock('../../src/lib/security/auth.service', () => ({
  getCurrentSession: () => ({
    userId: 'u1',
    role: 'administrator',
    loginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isLocked: false,
  }),
  getCurrentDEK: () => dek,
}));

function makeImageData(width: number, height: number, value = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  try {
    return new ImageData(data, width, height);
  } catch {
    return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
  }
}

describe('Vector Service', () => {
  describe('generateVector', () => {
    it('returns a Float32Array of length 128', () => {
      const img = makeImageData(32, 32);
      const vec = generateVector(img);
      expect(vec).toBeInstanceOf(Float32Array);
      expect(vec.length).toBe(128);
    });

    it('produces deterministic output for the same input', () => {
      const img = makeImageData(32, 32, 100);
      const v1 = generateVector(img);
      const v2 = generateVector(img);
      expect(v1).toEqual(v2);
    });

    it('produces different output for different brightness inputs', () => {
      const a = generateVector(makeImageData(32, 32, 50));
      const b = generateVector(makeImageData(32, 32, 200));
      // values should differ in at least one position
      let differ = false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });

    it('handles small images with floor(0) blocks gracefully', () => {
      const img = makeImageData(4, 4);
      const vec = generateVector(img);
      expect(vec.length).toBe(128);
      // Should return all zeros when blockW/blockH floor to 0
      // (width=4/16=0 → block loop cannot iterate; values default to 0)
      expect(Array.from(vec).every(v => v === 0)).toBe(true);
    });
  });

  describe.skipIf(!hasWebCrypto)('encryptAndStore', () => {
    beforeEach(async () => {
      await initDatabase();
      dek = await generateDataKey();
    });

    afterEach(async () => {
      dek = null;
      await resetDb();
    });

    it('encrypts and stores vector when DEK is available', async () => {
      const img = makeImageData(16, 16);
      const vector = generateVector(img);
      const record = await encryptAndStore('profile-1', vector);
      expect(record.profileId).toBe('profile-1');
      expect(record.encryptedData).toBeTruthy();
      expect(record.iv).toBeTruthy();
      expect(record.modelVersion).toBe('1.0-local');
    });

    it('throws when DEK is not available', async () => {
      dek = null;
      const vector = new Float32Array(128);
      await expect(encryptAndStore('profile-2', vector)).rejects.toThrow(/encryption key/i);
    });

    it('stored vector can be retrieved via getVectorByProfile', async () => {
      const vector = new Float32Array(128);
      await encryptAndStore('profile-3', vector);
      const found = await getVectorByProfile('profile-3');
      expect(found?.profileId).toBe('profile-3');
    });
  });

  describe('getVectorByProfile', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    afterEach(async () => {
      await resetDb();
    });

    it('returns undefined for unknown profile', async () => {
      const result = await getVectorByProfile('never-enrolled');
      expect(result).toBeUndefined();
    });
  });
});
