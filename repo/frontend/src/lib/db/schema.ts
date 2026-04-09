export const DB_NAME = 'forgeops-offline';
export const DB_VERSION = 2;

export const STORE_NAMES = {
  USERS: 'users',
  WAREHOUSES: 'warehouses',
  BINS: 'bins',
  SKUS: 'skus',
  STOCK_RECORDS: 'stock_records',
  MOVEMENT_LEDGER: 'movement_ledger',
  SAFETY_STOCK_CONFIGS: 'safety_stock_configs',
  ORDERS: 'orders',
  RESERVATIONS: 'reservations',
  WAVES: 'waves',
  TASKS: 'tasks',
  DISCREPANCIES: 'discrepancies',
  FILES: 'files',
  CHUNKS: 'chunks',
  TRANSFER_SESSIONS: 'transfer_sessions',
  VERSIONS: 'versions',
  RECYCLE_BIN: 'recycle_bin',
  FACE_PROFILES: 'face_profiles',
  CAPTURE_SESSIONS: 'capture_sessions',
  VECTORS: 'vectors',
  NOTIFICATIONS: 'notifications',
  QUEUED_ATTEMPTS: 'queued_attempts',
  SUBSCRIPTIONS: 'subscriptions',
  READ_RECEIPTS: 'read_receipts',
  NOTIFICATION_TEMPLATES: 'notification_templates',
} as const;

export interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: { unique?: boolean; multiEntry?: boolean };
}

export interface StoreDefinition {
  name: string;
  keyPath: string;
  indexes: StoreIndex[];
}

export const STORE_DEFINITIONS: StoreDefinition[] = [
  {
    name: STORE_NAMES.USERS,
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', options: { unique: true } },
      { name: 'role', keyPath: 'role' },
    ],
  },
  {
    name: STORE_NAMES.WAREHOUSES,
    keyPath: 'id',
    indexes: [
      { name: 'code', keyPath: 'code', options: { unique: true } },
      { name: 'parentId', keyPath: 'parentId' },
    ],
  },
  {
    name: STORE_NAMES.BINS,
    keyPath: 'id',
    indexes: [
      { name: 'warehouseId', keyPath: 'warehouseId' },
      { name: 'code', keyPath: 'code' },
      { name: 'zone', keyPath: 'zone' },
    ],
  },
  {
    name: STORE_NAMES.SKUS,
    keyPath: 'id',
    indexes: [
      { name: 'code', keyPath: 'code', options: { unique: true } },
      { name: 'category', keyPath: 'category' },
    ],
  },
  {
    name: STORE_NAMES.STOCK_RECORDS,
    keyPath: 'id',
    indexes: [
      { name: 'binId', keyPath: 'binId' },
      { name: 'skuId', keyPath: 'skuId' },
      { name: 'warehouseId', keyPath: 'warehouseId' },
      { name: 'warehouseId_skuId', keyPath: ['warehouseId', 'skuId'] },
    ],
  },
  {
    name: STORE_NAMES.MOVEMENT_LEDGER,
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'operatorId', keyPath: 'operatorId' },
      { name: 'skuId', keyPath: 'skuId' },
      { name: 'orderId', keyPath: 'orderId' },
    ],
  },
  {
    name: STORE_NAMES.SAFETY_STOCK_CONFIGS,
    keyPath: 'id',
    indexes: [
      { name: 'warehouseId', keyPath: 'warehouseId' },
      { name: 'skuId', keyPath: 'skuId' },
      { name: 'warehouseId_skuId', keyPath: ['warehouseId', 'skuId'] },
    ],
  },
  {
    name: STORE_NAMES.ORDERS,
    keyPath: 'id',
    indexes: [
      { name: 'orderNumber', keyPath: 'orderNumber', options: { unique: true } },
      { name: 'status', keyPath: 'status' },
      { name: 'createdBy', keyPath: 'createdBy' },
    ],
  },
  {
    name: STORE_NAMES.RESERVATIONS,
    keyPath: 'id',
    indexes: [
      { name: 'orderId', keyPath: 'orderId' },
      { name: 'status', keyPath: 'status' },
      { name: 'lastActivityAt', keyPath: 'lastActivityAt' },
    ],
  },
  {
    name: STORE_NAMES.WAVES,
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'waveNumber', keyPath: 'waveNumber' },
    ],
  },
  {
    name: STORE_NAMES.TASKS,
    keyPath: 'id',
    indexes: [
      { name: 'waveId', keyPath: 'waveId' },
      { name: 'pickerId', keyPath: 'pickerId' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: STORE_NAMES.DISCREPANCIES,
    keyPath: 'id',
    indexes: [
      { name: 'taskId', keyPath: 'taskId' },
      { name: 'state', keyPath: 'state' },
      { name: 'reportedBy', keyPath: 'reportedBy' },
    ],
  },
  {
    name: STORE_NAMES.FILES,
    keyPath: 'id',
    indexes: [
      { name: 'sha256', keyPath: 'sha256' },
      { name: 'name', keyPath: 'name' },
      { name: 'createdBy', keyPath: 'createdBy' },
      { name: 'isDeleted', keyPath: 'isDeleted' },
    ],
  },
  {
    name: STORE_NAMES.CHUNKS,
    keyPath: 'id',
    indexes: [
      { name: 'fileId', keyPath: 'fileId' },
      { name: 'chunkIndex', keyPath: 'chunkIndex' },
    ],
  },
  {
    name: STORE_NAMES.TRANSFER_SESSIONS,
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'fileId', keyPath: 'fileId' },
    ],
  },
  {
    name: STORE_NAMES.VERSIONS,
    keyPath: 'id',
    indexes: [
      { name: 'fileId', keyPath: 'fileId' },
      { name: 'versionNumber', keyPath: 'versionNumber' },
    ],
  },
  {
    name: STORE_NAMES.RECYCLE_BIN,
    keyPath: 'id',
    indexes: [
      { name: 'fileId', keyPath: 'fileId' },
      { name: 'expiresAt', keyPath: 'expiresAt' },
    ],
  },
  {
    name: STORE_NAMES.FACE_PROFILES,
    keyPath: 'id',
    indexes: [
      { name: 'groupId', keyPath: 'groupId' },
      { name: 'name', keyPath: 'name' },
      { name: 'enrolledBy', keyPath: 'enrolledBy' },
    ],
  },
  {
    name: STORE_NAMES.CAPTURE_SESSIONS,
    keyPath: 'id',
    indexes: [
      { name: 'profileId', keyPath: 'profileId' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: STORE_NAMES.VECTORS,
    keyPath: 'id',
    indexes: [
      { name: 'profileId', keyPath: 'profileId' },
    ],
  },
  {
    name: STORE_NAMES.NOTIFICATIONS,
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'eventType', keyPath: 'eventType' },
      { name: 'readAt', keyPath: 'readAt' },
    ],
  },
  {
    name: STORE_NAMES.QUEUED_ATTEMPTS,
    keyPath: 'id',
    indexes: [
      { name: 'notificationId', keyPath: 'notificationId' },
      { name: 'status', keyPath: 'status' },
      { name: 'scheduledAt', keyPath: 'scheduledAt' },
    ],
  },
  {
    name: STORE_NAMES.SUBSCRIPTIONS,
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'eventType', keyPath: 'eventType' },
    ],
  },
  {
    name: STORE_NAMES.READ_RECEIPTS,
    keyPath: 'id',
    indexes: [
      { name: 'notificationId', keyPath: 'notificationId' },
      { name: 'userId', keyPath: 'userId' },
    ],
  },
  {
    name: STORE_NAMES.NOTIFICATION_TEMPLATES,
    keyPath: 'id',
    indexes: [
      { name: 'eventType', keyPath: 'eventType' },
      { name: 'channel', keyPath: 'channel' },
    ],
  },
];
