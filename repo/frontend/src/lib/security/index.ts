export {
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
} from './crypto';

export {
  bootstrap,
  createInitialAdmin,
  createUser,
  login,
  logout,
  lock,
  unlock,
  getCurrentSession,
  getCurrentDEK,
} from './auth.service';

export { IdleLockMonitor } from './idle-monitor';

export {
  PERMISSION_MATRIX,
  ROUTE_ACCESS,
  MUTATION_ACCESS,
  canAccess,
  canMutate,
  canReveal,
  isReadOnly,
} from './permissions';

export {
  MASKED_FIELDS,
  maskValue,
  shouldMask,
  canRevealField,
} from './masking';
