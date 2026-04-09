import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  enrollProfile,
  getProfiles,
  getProfileById,
  decryptProfileAttributes,
  exportProfiles,
  importProfiles,
} from '../../src/modules/identity/identity.service';
import * as authService from '../../src/lib/security/auth.service';
import { generateDataKey } from '../../src/lib/security/crypto';

const hasWebCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

describe.skipIf(!hasWebCrypto)('Identity Attribute Encryption', () => {
  let mockDEK: CryptoKey;

  beforeEach(async () => {
    await initDatabase();
    mockDEK = await generateDataKey();
    vi.spyOn(authService, 'getCurrentDEK').mockReturnValue(mockDEK);
    vi.spyOn(authService, 'getCurrentSession').mockReturnValue({
      userId: 'test-user',
      role: 'administrator' as any,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
  });

  afterEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it('enrollProfile stores encrypted attributes at rest', async () => {
    const profile = await enrollProfile('Test', 'g1', { dept: 'engineering' });
    expect(profile.attributes.dept).toBe('engineering');
    expect(profile.encryptedAttributes).toBeTruthy();
    expect(profile.attributesIV).toBeTruthy();
  });

  it('getProfileById decrypts attributes', async () => {
    const enrolled = await enrollProfile('Test', undefined, { key: 'value' });
    const retrieved = await getProfileById(enrolled.id);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.attributes.key).toBe('value');
  });

  it('getProfiles decrypts all attributes', async () => {
    await enrollProfile('A', undefined, { a: '1' });
    await enrollProfile('B', undefined, { b: '2' });
    const profiles = await getProfiles();
    expect(profiles).toHaveLength(2);
    expect(Object.keys(profiles[0].attributes).length + Object.keys(profiles[1].attributes).length).toBe(2);
  });

  it('returns empty attributes when DEK unavailable', async () => {
    await enrollProfile('Test', undefined, { secret: 'data' });
    vi.spyOn(authService, 'getCurrentDEK').mockReturnValue(null);
    const profiles = await getProfiles();
    expect(profiles[0].attributes).toEqual({});
  });

  it('decryptProfileAttributes handles legacy plaintext records', async () => {
    const legacy = {
      id: 'legacy-1',
      name: 'Legacy',
      attributes: { old: 'data' },
      enrolledBy: 'admin',
      enrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    const result = await decryptProfileAttributes(legacy as any);
    expect(result.old).toBe('data');
  });

  it('exportProfiles includes decrypted attributes in JSON', async () => {
    await enrollProfile('Test', undefined, { dept: 'eng' });
    const json = await exportProfiles([], 'json');
    const parsed = JSON.parse(json);
    expect(parsed.profiles[0].attributes.dept).toBe('eng');
  });

  it('importProfiles encrypts attributes on import', async () => {
    const data = JSON.stringify([{ name: 'Imported', attributes: { role: 'admin' } }]);
    const result = await importProfiles(data, 'json');
    expect(result.importedCount).toBe(1);

    const profiles = await getProfiles();
    expect(profiles[0].encryptedAttributes).toBeTruthy();
    expect(profiles[0].attributes.role).toBe('admin');
  });
});
