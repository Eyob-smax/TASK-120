// Inventory
export const SAFETY_STOCK_DEFAULT = 20;

// Reservations
export const RESERVATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Wave planning
export const WAVE_DEFAULT_SIZE = 25;

// File transfer
export const FILE_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_CONCURRENT_CHUNKS = 3;
export const DEFAULT_BANDWIDTH_CAP = 5 * 1024 * 1024; // 5 MB/s

// File versioning
export const MAX_FILE_VERSIONS = 10;

// Recycle bin
export const RECYCLE_BIN_RETENTION_DAYS = 30;
export const RECYCLE_BIN_RETENTION_MS = RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Notifications — retry semantics:
// Attempt 1 = initial send (scheduled immediately).
// Attempts 2, 3, 4 = retries scheduled at 1 min, 5 min, 15 min after the
// preceding attempt is processed.  NOTIFICATION_RETRY_DELAYS[i] is the delay
// used after processing attempt (i+1), so the array length equals the number
// of retries.  MAX_NOTIFICATION_RETRIES is kept in sync for display/validation.
export const NOTIFICATION_RETRY_DELAYS = [60_000, 300_000, 900_000]; // 1, 5, 15 minutes
export const MAX_NOTIFICATION_RETRIES = 3;

// Authentication / security
export const IDLE_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_SALT_LENGTH = 16; // 128 bits
export const AES_KEY_LENGTH = 256;
export const AES_IV_LENGTH = 12; // 96 bits

// Face capture
export const MIN_CAPTURE_WIDTH = 1280;
export const MIN_CAPTURE_HEIGHT = 720;
export const BRIGHTNESS_RANGE = { min: 40, max: 220 };
export const OCCLUSION_THRESHOLD = 0.7;
export const LIVENESS_FRAME_COUNT = 5;
export const LIVENESS_DURATION_MS = 3_000;

// Preferences
export const SEARCH_HISTORY_CAP = 50;
export const LOCAL_STORAGE_PREFIX = 'forgeops:';
