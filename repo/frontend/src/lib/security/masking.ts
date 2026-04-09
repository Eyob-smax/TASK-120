import type { RevealCapability } from '$lib/types/auth';
import { UserRole } from '$lib/types/enums';
import { canReveal } from './permissions';

const { WarehouseManager, PickerPacker, Auditor } = UserRole;

interface MaskConfig {
  maskFor: UserRole[];
  revealCapability: RevealCapability;
}

export const MASKED_FIELDS: Record<string, MaskConfig> = {
  email: {
    maskFor: [WarehouseManager, PickerPacker, Auditor],
    revealCapability: 'users.reveal_contact',
  },
  displayName: {
    maskFor: [Auditor],
    revealCapability: 'identity.reveal_basic',
  },
  attributes: {
    maskFor: [WarehouseManager, PickerPacker, Auditor],
    revealCapability: 'identity.reveal_sensitive',
  },
  encryptedData: {
    maskFor: [WarehouseManager, PickerPacker, Auditor],
    revealCapability: 'identity.reveal_sensitive',
  },
  fileEncryptionKey: {
    maskFor: [WarehouseManager, PickerPacker, Auditor],
    revealCapability: 'files.reveal_key_metadata',
  },
};

export function maskValue(
  value: string,
  type: 'email' | 'name' | 'default' = 'default',
): string {
  switch (type) {
    case 'email':
      return '••••@••••';
    case 'name':
      return '••••••';
    default:
      return '••••••••';
  }
}

export function shouldMask(fieldName: string, role: UserRole): boolean {
  const config = MASKED_FIELDS[fieldName];
  if (!config) return false;
  return config.maskFor.includes(role);
}

export function canRevealField(fieldName: string, role: UserRole): boolean {
  const config = MASKED_FIELDS[fieldName];
  if (!config) return true;
  return canReveal(role, config.revealCapability);
}
