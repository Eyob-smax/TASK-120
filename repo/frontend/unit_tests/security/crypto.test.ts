import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  deriveKey,
  generateDataKey,
  wrapKey,
  unwrapKey,
  encrypt,
  decrypt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../../src/lib/security/crypto';
import { PBKDF2_SALT_LENGTH } from '../../src/lib/constants';

const hasWebCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

describe.skipIf(!hasWebCrypto)('Crypto Primitives', () => {
  describe('Base64 Helpers', () => {
    it('arrayBufferToBase64 and base64ToArrayBuffer round-trip', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
      const b64 = arrayBufferToBase64(original.buffer);
      const restored = new Uint8Array(base64ToArrayBuffer(b64));
      expect(restored).toEqual(original);
    });

    it('uint8ArrayToBase64 and base64ToUint8Array round-trip', () => {
      const original = new Uint8Array([10, 20, 30, 40]);
      const b64 = uint8ArrayToBase64(original);
      const restored = base64ToUint8Array(b64);
      expect(restored).toEqual(original);
    });

    it('handles empty buffer', () => {
      const b64 = arrayBufferToBase64(new ArrayBuffer(0));
      const restored = base64ToArrayBuffer(b64);
      expect(restored.byteLength).toBe(0);
    });
  });

  describe('Salt Generation', () => {
    it('generates salt of correct length', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(PBKDF2_SALT_LENGTH);
    });

    it('generates different salts each call', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(uint8ArrayToBase64(salt1)).not.toBe(uint8ArrayToBase64(salt2));
    });
  });

  describe('PBKDF2 Hashing', () => {
    it('hashPassword returns 32-byte ArrayBuffer', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('TestPass1', salt);
      expect(hash.byteLength).toBe(32);
    });

    it('verifyPassword returns true for correct password', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('TestPass1', salt);
      const valid = await verifyPassword('TestPass1', salt, hash);
      expect(valid).toBe(true);
    });

    it('verifyPassword returns false for wrong password', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('TestPass1', salt);
      const valid = await verifyPassword('WrongPass2', salt, hash);
      expect(valid).toBe(false);
    });

    it('different salts produce different hashes', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = await hashPassword('TestPass1', salt1);
      const hash2 = await hashPassword('TestPass1', salt2);
      expect(arrayBufferToBase64(hash1)).not.toBe(arrayBufferToBase64(hash2));
    });
  });

  describe('Key Derivation', () => {
    it('deriveKey returns a CryptoKey', async () => {
      const salt = generateSalt();
      const key = await deriveKey('TestPass1', salt);
      expect(key).toBeDefined();
      expect(key.algorithm).toHaveProperty('name', 'AES-GCM');
    });

    it('generateDataKey returns extractable CryptoKey', async () => {
      const key = await generateDataKey();
      expect(key).toBeDefined();
      expect(key.extractable).toBe(true);
    });
  });

  describe('Key Wrap/Unwrap', () => {
    it('wraps and unwraps a data key successfully', async () => {
      const salt = generateSalt();
      const kek = await deriveKey('TestPass1', salt);
      const dek = await generateDataKey();

      const { wrapped, iv } = await wrapKey(dek, kek);
      expect(wrapped.byteLength).toBeGreaterThan(0);
      expect(iv).toBeInstanceOf(Uint8Array);

      const unwrapped = await unwrapKey(wrapped, iv, kek);
      expect(unwrapped).toBeDefined();

      // Verify the unwrapped key works for encryption
      const { ciphertext, iv: encIv } = await encrypt('test data', unwrapped);
      const result = await decrypt(ciphertext, encIv, unwrapped);
      expect(result).toBe('test data');
    });
  });

  describe('AES-GCM Encrypt/Decrypt', () => {
    it('encrypts and decrypts a string', async () => {
      const key = await generateDataKey();
      const plaintext = 'Hello, World! 🌍';
      const { ciphertext, iv } = await encrypt(plaintext, key);
      const result = await decrypt(ciphertext, iv, key);
      expect(result).toBe(plaintext);
    });

    it('different IVs produce different ciphertexts', async () => {
      const key = await generateDataKey();
      const { ciphertext: ct1 } = await encrypt('same data', key);
      const { ciphertext: ct2 } = await encrypt('same data', key);
      expect(arrayBufferToBase64(ct1)).not.toBe(arrayBufferToBase64(ct2));
    });

    it('decrypt with wrong key throws', async () => {
      const key1 = await generateDataKey();
      const key2 = await generateDataKey();
      const { ciphertext, iv } = await encrypt('secret', key1);
      await expect(decrypt(ciphertext, iv, key2)).rejects.toThrow();
    });

    it('handles empty string', async () => {
      const key = await generateDataKey();
      const { ciphertext, iv } = await encrypt('', key);
      const result = await decrypt(ciphertext, iv, key);
      expect(result).toBe('');
    });
  });
});
