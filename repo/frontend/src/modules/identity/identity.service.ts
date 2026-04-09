import { FaceProfileRepository, CaptureSessionRepository } from '$lib/db';
import { createLogger } from '$lib/logging';
import { getCurrentDEK } from '$lib/security/auth.service';
import {
  encrypt,
  arrayBufferToBase64,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '$lib/security/crypto';
import type { FaceProfile, CaptureSession, ImportResult } from '$lib/types/identity';
import type { ValidationError } from '$lib/types/common';

const profileRepo = new FaceProfileRepository();
const captureRepo = new CaptureSessionRepository();
const logger = createLogger('identity');

export async function enrollProfile(
  name: string,
  groupId?: string,
  attributes: Record<string, string> = {},
): Promise<FaceProfile> {
  const dek = getCurrentDEK();

  let encryptedAttributes: string | undefined;
  let attributesIV: string | undefined;

  if (dek) {
    const json = JSON.stringify(attributes);
    const { ciphertext, iv } = await encrypt(json, dek);
    encryptedAttributes = arrayBufferToBase64(ciphertext);
    attributesIV = uint8ArrayToBase64(iv);
  }

  const now = new Date().toISOString();
  const profile: FaceProfile = {
    id: crypto.randomUUID(),
    name,
    groupId,
    attributes: dek ? {} : attributes,
    encryptedAttributes,
    attributesIV,
    enrolledBy: 'current-user',
    enrolledAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await profileRepo.add(profile);
  logger.info('Profile enrolled', { profileId: profile.id, name });
  return { ...profile, attributes };
}

export async function startEnrollment(profileId?: string): Promise<CaptureSession> {
  const now = new Date().toISOString();
  const session: CaptureSession = {
    id: crypto.randomUUID(),
    profileId,
    status: 'initializing',
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await captureRepo.add(session);
  return session;
}

export async function updateSessionStatus(
  sessionId: string,
  status: CaptureSession['status'],
): Promise<CaptureSession> {
  const session = await captureRepo.getById(sessionId);
  if (!session) throw new Error('Capture session not found');
  const now = new Date().toISOString();
  return captureRepo.put({
    ...session,
    status,
    completedAt: status === 'completed' || status === 'failed' ? now : undefined,
    updatedAt: now,
  });
}

export async function decryptProfileAttributes(
  profile: FaceProfile,
): Promise<Record<string, string>> {
  if (!profile.encryptedAttributes || !profile.attributesIV) {
    return profile.attributes;
  }

  const dek = getCurrentDEK();
  if (!dek) return {};

  try {
    const ciphertextBytes = base64ToUint8Array(profile.encryptedAttributes);
    const ivBytes = base64ToUint8Array(profile.attributesIV);
    // Use Uint8Array directly as BufferSource (avoids ArrayBuffer type issues in Node.js)
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      dek,
      ciphertextBytes,
    );
    const json = new TextDecoder().decode(plaintext);
    return JSON.parse(json);
  } catch {
    logger.warn('Failed to decrypt profile attributes', { profileId: profile.id });
    return {};
  }
}

export async function getProfiles(): Promise<FaceProfile[]> {
  const profiles = await profileRepo.getAll();
  return Promise.all(profiles.map(async (p) => ({
    ...p,
    attributes: await decryptProfileAttributes(p),
  })));
}

export async function getProfileById(id: string): Promise<FaceProfile | undefined> {
  const profile = await profileRepo.getById(id);
  if (!profile) return undefined;
  return {
    ...profile,
    attributes: await decryptProfileAttributes(profile),
  };
}

export async function importProfiles(
  data: string,
  format: 'json' | 'csv',
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  let profiles: Partial<FaceProfile>[] = [];

  try {
    if (format === 'json') {
      const parsed = JSON.parse(data);
      profiles = Array.isArray(parsed) ? parsed : parsed.profiles ?? [];
    } else {
      const lines = data.split('\n').filter(l => l.trim());
      if (lines.length < 2) return { totalRecords: 0, importedCount: 0, skippedCount: 0, errors: [] };
      const headers = lines[0].split(',').map(h => h.trim());
      profiles = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        return { name: obj.name, groupId: obj.group || obj.groupId, attributes: obj };
      });
    }
  } catch (e) {
    errors.push({ field: 'file', message: 'Failed to parse file', code: 'parse_error' });
    return { totalRecords: 0, importedCount: 0, skippedCount: 0, errors };
  }

  let importedCount = 0;
  let skippedCount = 0;

  for (const p of profiles) {
    if (!p.name) {
      skippedCount++;
      errors.push({ field: 'name', message: 'Profile missing name', code: 'required' });
      continue;
    }
    await enrollProfile(p.name, p.groupId, p.attributes ?? {});
    importedCount++;
  }

  logger.info('Profiles imported', { total: profiles.length, imported: importedCount, skipped: skippedCount });
  return { totalRecords: profiles.length, importedCount, skippedCount, errors };
}

export async function exportProfiles(
  profileIds: string[],
  format: 'json' | 'csv',
): Promise<string> {
  const profiles = profileIds.length > 0
    ? (await Promise.all(profileIds.map(id => getProfileById(id)))).filter(Boolean) as FaceProfile[]
    : await getProfiles();

  if (format === 'json') {
    return JSON.stringify({
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      profiles: profiles.map(p => ({
        id: p.id, name: p.name, group: p.groupId,
        attributes: p.attributes, enrolledAt: p.enrolledAt,
      })),
    }, null, 2);
  }

  // CSV
  const headers = ['id', 'name', 'group', 'enrolledAt'];
  const rows = profiles.map(p => [p.id, p.name, p.groupId ?? '', p.enrolledAt].join(','));
  return [headers.join(','), ...rows].join('\n');
}
