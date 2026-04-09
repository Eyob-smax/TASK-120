import { VectorRepository } from '$lib/db';
import { getCurrentDEK } from '$lib/security/auth.service';
import { encrypt, arrayBufferToBase64, uint8ArrayToBase64 } from '$lib/security/crypto';
import { createLogger } from '$lib/logging';
import type { EncryptedVector } from '$lib/types/identity';

const vectorRepo = new VectorRepository();
const logger = createLogger('identity');

/**
 * Generate a deterministic feature vector from image data.
 *
 * DISCLOSURE: This is an on-device application feature for local identity
 * records. It is NOT a certified biometric verification system. The vector
 * is a deterministic embedding derived from pixel analysis, suitable for
 * local profile matching experiments within the app.
 */
export function generateVector(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const vectorSize = 128;
  const vector = new Float32Array(vectorSize);

  // Grid-based feature extraction: divide image into blocks
  const blockW = Math.floor(width / 16);
  const blockH = Math.floor(height / 8);

  let vi = 0;
  for (let by = 0; by < 8 && vi < vectorSize; by++) {
    for (let bx = 0; bx < 16 && vi < vectorSize; bx++) {
      let sum = 0;
      let count = 0;

      for (let y = by * blockH; y < (by + 1) * blockH && y < height; y++) {
        for (let x = bx * blockW; x < (bx + 1) * blockW && x < width; x++) {
          const idx = (y * width + x) * 4;
          sum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          count++;
        }
      }

      vector[vi] = count > 0 ? sum / count / 255 : 0;
      vi++;
    }
  }

  return vector;
}

export async function encryptAndStore(
  profileId: string,
  vector: Float32Array,
): Promise<EncryptedVector> {
  const dek = getCurrentDEK();
  if (!dek) {
    throw new Error('No encryption key available. User must be logged in.');
  }

  const vectorString = JSON.stringify(Array.from(vector));
  const { ciphertext, iv } = await encrypt(vectorString, dek);

  const now = new Date().toISOString();
  const record: EncryptedVector = {
    id: crypto.randomUUID(),
    profileId,
    encryptedData: arrayBufferToBase64(ciphertext),
    iv: uint8ArrayToBase64(iv),
    modelVersion: '1.0-local',
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await vectorRepo.add(record);
  logger.info('Vector encrypted and stored', { profileId });
  return record;
}

export async function getVectorByProfile(profileId: string): Promise<EncryptedVector | undefined> {
  const vectors = await vectorRepo.getByProfile(profileId);
  return vectors[0];
}
