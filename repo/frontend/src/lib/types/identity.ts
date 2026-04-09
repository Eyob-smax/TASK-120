import type { BaseEntity, ValidationError } from './common';
import type { QualityCheckResult, LivenessResult as LivenessResultEnum } from './enums';

export interface FaceProfile extends BaseEntity {
  name: string;
  groupId?: string;
  attributes: Record<string, string>;
  encryptedAttributes?: string;
  attributesIV?: string;
  vectorId?: string;
  enrolledBy: string;
  enrolledAt: string;
}

export interface CaptureSession extends BaseEntity {
  profileId?: string;
  status: 'initializing' | 'capturing' | 'processing' | 'completed' | 'failed';
  deviceInfo?: string;
  startedAt: string;
  completedAt?: string;
}

export interface QualityResult {
  checkType: QualityCheckResult;
  passed: boolean;
  details: string;
  measuredValue?: number;
  threshold?: number;
}

export interface LivenessAttempt extends BaseEntity {
  sessionId: string;
  result: LivenessResultEnum;
  framesCaptured: number;
  durationMs: number;
  attemptedAt: string;
}

export interface EncryptedVector extends BaseEntity {
  profileId: string;
  encryptedData: string;
  iv: string;
  modelVersion: string;
  extractedAt: string;
}

export interface ProfileGroup extends BaseEntity {
  name: string;
  description?: string;
  memberCount: number;
}

export interface ImportResult {
  totalRecords: number;
  importedCount: number;
  skippedCount: number;
  errors: ValidationError[];
}

export interface ExportConfig {
  format: 'json' | 'csv';
  profileIds: string[];
  includeAttributes: boolean;
  includeGroupInfo: boolean;
}
