/**
 * Identity Module
 *
 * Face enrollment with webcam capture, quality checks, liveness flow,
 * feature-vector generation, encrypted storage, and profile management.
 */

// Capture
export { initCamera, captureFrame, stopCamera } from './capture.service';

// Quality checks
export { checkResolution, checkBrightness, checkOcclusion, runAllQualityChecks } from './quality.service';

// Liveness
export { LivenessFlow } from './liveness.service';

// Vector
export { generateVector, encryptAndStore, getVectorByProfile } from './vector.service';

// Identity service
export {
  enrollProfile,
  startEnrollment,
  updateSessionStatus,
  getProfiles,
  getProfileById,
  importProfiles,
  exportProfiles,
} from './identity.service';

// Store
export { identityStore, captureStore, loadProfiles } from './identity.store';
