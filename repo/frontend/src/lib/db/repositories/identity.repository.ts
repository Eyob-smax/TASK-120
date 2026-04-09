import { Repository } from '../repository';
import { STORE_NAMES } from '../schema';
import type { FaceProfile, CaptureSession, EncryptedVector, ProfileGroup } from '$lib/types/identity';

export class FaceProfileRepository extends Repository<FaceProfile> {
  constructor() {
    super(STORE_NAMES.FACE_PROFILES);
  }

  async getByGroup(groupId: string): Promise<FaceProfile[]> {
    return this.getByIndex('groupId', groupId);
  }

  async getByName(name: string): Promise<FaceProfile[]> {
    return this.getByIndex('name', name);
  }

  async getByEnroller(enrolledBy: string): Promise<FaceProfile[]> {
    return this.getByIndex('enrolledBy', enrolledBy);
  }
}

export class CaptureSessionRepository extends Repository<CaptureSession> {
  constructor() {
    super(STORE_NAMES.CAPTURE_SESSIONS);
  }

  async getByProfile(profileId: string): Promise<CaptureSession[]> {
    return this.getByIndex('profileId', profileId);
  }
}

export class VectorRepository extends Repository<EncryptedVector> {
  constructor() {
    super(STORE_NAMES.VECTORS);
  }

  async getByProfile(profileId: string): Promise<EncryptedVector[]> {
    return this.getByIndex('profileId', profileId);
  }
}
