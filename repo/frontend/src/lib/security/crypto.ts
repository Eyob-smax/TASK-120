import {
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_LENGTH,
  AES_KEY_LENGTH,
  AES_IV_LENGTH,
} from '$lib/constants';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// --- Base64 helpers ---

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function uint8ArrayToBase64(arr: Uint8Array): string {
  return arrayBufferToBase64(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));
}

export function base64ToUint8Array(b64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(b64));
}

// --- Salt generation ---

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
}

// --- PBKDF2 password hashing ---

async function importPasswordKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );
}

export async function hashPassword(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const baseKey = await importPasswordKey(password);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    AES_KEY_LENGTH,
  );
}

export async function verifyPassword(
  password: string,
  salt: Uint8Array,
  expectedHash: ArrayBuffer,
): Promise<boolean> {
  const actualHash = await hashPassword(password, salt);
  const a = new Uint8Array(actualHash);
  const b = new Uint8Array(expectedHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// --- Key derivation (KEK from password) ---

export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

// --- Data Encryption Key (DEK) ---

export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

// --- Key wrapping ---

export async function wrapKey(
  dataKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    dataKey,
    wrappingKey,
    { name: 'AES-GCM', iv },
  );
  return { wrapped, iv };
}

export async function unwrapKey(
  wrapped: ArrayBuffer,
  iv: Uint8Array,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    new Uint8Array(wrapped),
    wrappingKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

// --- AES-GCM encrypt/decrypt ---

export async function encrypt(
  data: string,
  key: CryptoKey,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data),
  );
  return { ciphertext, iv };
}

export async function decrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return decoder.decode(plaintext);
}

// --- Binary AES-GCM encrypt/decrypt (for file chunks) ---

export async function encryptBinary(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new Uint8Array(data),
  );
  return { ciphertext, iv };
}

export async function decryptBinary(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    new Uint8Array(ciphertext),
  );
}
