# ForgeOps Offline Console — Local API & Contract Specification

> **This document describes internal module-to-module contracts, storage schemas, and data formats used within the browser SPA. There is no remote backend API. All operations execute locally in the browser.**

---

## 1. Purpose

This specification defines the service boundaries, method contracts, storage schemas, event contracts, and import/export formats for the ForgeOps Offline Console frontend application. It serves as the interface contract between modules and between the service layer and persistence layer.

---

## 2. Module Service Boundaries

### 2.1 AuthService (`$lib/security/`)

Manages local-only pseudo-login, session state, idle lock, and permission checks.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `bootstrap()` | none | `{ isFirstRun: boolean }` | Check if any users exist in IndexedDB |
| `createInitialAdmin(username, password, profile)` | credentials + profile | `User` | First-run only admin creation. Throws `AuthorizationError` if users exist |
| `createUser(username, password, role, profile)` | credentials + role + profile | `User` | Admin-only user creation. Throws `AuthorizationError` if not admin |
| `login(username, password)` | credentials | `Session` | Verify PBKDF2 hash, derive KEK, unwrap DEK. Throws `AuthenticationError` on failure |
| `logout()` | none | `void` | Clear session and in-memory DEK |
| `lock()` | none | `void` | Set session.isLocked, clear in-memory DEK |
| `unlock(password)` | password | `Session` | Re-derive KEK, unwrap DEK, restore session. Throws `AuthenticationError` on failure |
| `getCurrentSession()` | none | `Session \| null` | Current in-memory session |
| `getCurrentDEK()` | none | `CryptoKey \| null` | Current in-memory data encryption key |

#### Permission Functions (`$lib/security/permissions.ts`)

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `canAccess(role, route)` | UserRole + route path | `boolean` | Route-level access check |
| `canMutate(role, action)` | UserRole + action string | `boolean` | Mutation permission check |
| `canReveal(role, capability)` | UserRole + RevealCapability | `boolean` | Reveal-gating check |
| `isReadOnly(role)` | UserRole | `boolean` | Returns true for Auditor |

#### Masking Functions (`$lib/security/masking.ts`)

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `maskValue(value, type?)` | string + optional type | `string` | Returns masked placeholder |
| `shouldMask(fieldName, role)` | field + UserRole | `boolean` | Check if field is masked for role |
| `canRevealField(fieldName, role)` | field + UserRole | `boolean` | Check if role can reveal field |

#### Error Types (`$lib/services/errors.ts`)

| Error | Code | Thrown by |
|-------|------|----------|
| `AuthenticationError` | `AUTHENTICATION_FAILED` | `login()`, `unlock()` |
| `AuthorizationError` | `AUTHORIZATION_DENIED` | `createUser()`, `createInitialAdmin()`, permission guards |
| `ValidationServiceError` | `VALIDATION_FAILED` | Service-layer validation |
| `ConflictError` | `VERSION_CONFLICT` | Optimistic concurrency failures |

#### Logging Categories

| Category | Used by |
|----------|---------|
| `auth` | Auth service, login/logout/lock events |
| `inventory` | Inventory operations |
| `files` | File transfer and version operations |
| `notifications` | Notification queue and delivery |
| `identity` | Face enrollment and profile operations |
| `security` | Crypto operations, permission checks |
| `app` | Bootstrap, initialization |

### 2.2 InventoryService (`$modules/inventory/`)

Manages warehouses, bins, stock, movements, and safety stock monitoring.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getWarehouses()` | none | `Warehouse[]` | List all warehouses |
| `getBins(warehouseId)` | warehouse ID | `Bin[]` | List bins in a warehouse |
| `getStock(filters?)` | optional filters | `StockRecord[]` | Query stock records |
| `receiveStock(binId, skuId, qty, reason)` | inbound details | `MovementEntry` | Inbound receipt |
| `shipStock(binId, skuId, qty, reason)` | outbound details | `MovementEntry` | Outbound shipment |
| `transferStock(fromBin, toBin, skuId, qty)` | transfer details | `MovementEntry[]` | Bin-to-bin transfer (two ledger entries) |
| `cycleCount(binId, skuId, actualQty)` | count details | `MovementEntry` | Cycle count adjustment |
| `getLedger(filters?)` | optional filters | `MovementEntry[]` | Query immutable ledger |
| `checkSafetyStock(warehouseId?)` | optional warehouse | `SafetyStockAlert[]` | Check all SKUs against thresholds |

### 2.3 OrderService (`$modules/orders/`)

Manages orders, stock reservations, wave planning, pick tasks, and discrepancies.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `createOrder(orderData)` | order details + lines | `Order` | Create order, reserve stock |
| `cancelOrder(orderId)` | order ID | `Order` | Cancel order, release reservations immediately |
| `getReservations(orderId?)` | optional order ID | `Reservation[]` | Active reservations |
| `releaseExpired()` | none | `Reservation[]` | Release reservations past 30-min inactivity |
| `planWave(orderIds, options?)` | order IDs + config | `Wave` | Create wave (default 25 lines) |
| `assignTask(waveId, pickerId)` | wave + picker | `PickerTask` | Assign picker to wave tasks |
| `getPickPath(taskId)` | task ID | `PickPathStep[]` | Ordered pick path: zone priority then bin alpha |
| `reportDiscrepancy(taskId, details)` | task + discrepancy info | `Discrepancy` | Open discrepancy record |
| `verifyDiscrepancy(discrepancyId, verification)` | ID + notes/attachments | `Discrepancy` | Verify discrepancy before packing |
| `resolvePacking(discrepancyId)` | ID | `Discrepancy` | Clear discrepancy, allow packing |

### 2.4 FileService (`$modules/files/`)

Manages file ingestion, dedup, versioning, recycle bin, and preview.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `ingestFile(file, options?)` | File object + config | `TransferSession` | Start chunked ingestion |
| `checkDedup(hash)` | SHA-256 hash string | `{ exists: boolean; fileId?: string }` | Check for duplicate payload |
| `pauseTransfer(sessionId)` | session ID | `TransferSession` | Pause active transfer |
| `resumeTransfer(sessionId)` | session ID | `TransferSession` | Resume paused transfer |
| `getVersions(fileId)` | file ID | `Version[]` | List file versions (max 10) |
| `rollbackVersion(fileId, versionId)` | file + version ID | `FileRecord` | Rollback to specific version |
| `deleteFile(fileId)` | file ID | `RecycleBinEntry` | Move to recycle bin |
| `restoreFile(entryId)` | recycle bin entry ID | `FileRecord` | Restore from recycle bin |
| `purgeExpired()` | none | `number` | Remove entries past 30-day retention |
| `getPreviewUrl(fileId)` | file ID | `string \| null` | Blob URL for supported preview formats |
| `setBandwidthCap(bytesPerSecond)` | number | `void` | Update transfer speed limit |

### 2.5 IdentityService (`$modules/identity/`)

Manages face enrollment, quality checks, liveness, vectors, and profile management.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `startCapture()` | none | `CaptureSession` | Initialize webcam and capture session |
| `captureFrame(sessionId)` | session ID | `FrameData` | Capture single frame from video stream |
| `runQualityCheck(frameData)` | frame data | `QualityResult` | Check resolution, brightness, occlusion |
| `runLivenessCheck(sessionId)` | session ID | `LivenessResult` | Execute blink-and-turn timed sequence |
| `generateVector(frameData)` | validated frame | `EncryptedVector` | Extract and encrypt feature vector |
| `enrollProfile(profileData, vector)` | profile + encrypted vector | `FaceProfile` | Create new identity profile |
| `getProfiles(filters?)` | optional filters | `FaceProfile[]` | Query profiles |
| `importProfiles(file, format)` | File + 'json' \| 'csv' | `ImportResult` | Bulk import from local file |
| `exportProfiles(profileIds, format)` | IDs + format | `Blob` | Export selected profiles |
| `getGroups()` | none | `Group[]` | List profile groups |

### 2.6 NotificationService (`$modules/notifications/`)

Manages inbox items, queued attempts, retries, subscriptions, and receipts.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `createInboxItem(event)` | event data | `Notification` | Create in-app notification |
| `getInbox(userId, filters?)` | user ID + filters | `Notification[]` | Query user's inbox |
| `markRead(notificationId)` | notification ID | `ReadReceipt` | Record read receipt |
| `queueAttempt(notificationId, channel, template)` | notification + channel | `QueuedAttempt` | Queue external channel attempt |
| `processRetries()` | none | `QueuedAttempt[]` | Process overdue retries (1, 5, 15 min) |
| `getSubscriptions(userId)` | user ID | `Subscription[]` | Get event type preferences |
| `updateSubscription(userId, eventType, config)` | subscription config | `Subscription` | Set subscription preference |
| `getAttemptLog(notificationId?)` | optional notification ID | `QueuedAttempt[]` | Audit log of queue attempts |

### 2.7 PreferenceService (`$modules/preferences/`)

Manages LocalStorage-backed user preferences.

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getColumnLayout(tableId)` | table identifier | `ColumnLayout` | Column visibility and order |
| `saveColumnLayout(tableId, layout)` | table + layout | `void` | Persist column layout |
| `getFilters(screenId)` | screen identifier | `FilterState` | Last-used filter state |
| `saveFilters(screenId, filters)` | screen + filters | `void` | Persist filter state |
| `getSearchHistory()` | none | `string[]` | Recent searches (max 50) |
| `addSearchEntry(query)` | search string | `void` | Add entry, enforce 50-entry cap |
| `clearSearchHistory()` | none | `void` | Clear all search history |

---

## 3. Storage Contracts (IndexedDB)

### 3.1 Database Configuration

| Property | Value |
|----------|-------|
| Database name | `forgeops-offline` |
| Library | `idb` (^8.0.0) |
| Migration strategy | Versioned upgrades via `idb` `upgrade` callback |

### 3.2 Store Schemas

Each store is defined with its key path, indexes, and a representative TypeScript interface reference. Full type definitions will be in `$lib/types/`.

#### `users`
```typescript
interface User {
  id: string;              // UUID v4
  username: string;        // unique
  passwordHash: string;    // PBKDF2 output, base64
  salt: string;            // base64
  role: UserRole;          // enum
  wrappedDEK: string;     // AES-GCM wrapped data encryption key, base64
  dekIV: string;          // IV used for DEK wrapping, base64
  profile: UserProfile;   // name, email (encrypted if sensitive)
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
  version: number;        // optimistic concurrency
}
// Indexes: username (unique)
```

#### `movement_ledger`
```typescript
interface MovementEntry {
  id: string;             // UUID v4
  timestamp: string;      // ISO 8601
  operatorId: string;     // user ID
  sourceBinId: string | null;
  destinationBinId: string | null;
  skuId: string;
  quantity: number;
  reasonCode: MovementReason; // enum
  orderId?: string;
  notes?: string;
  version: number;
}
// Indexes: timestamp, operatorId, skuId, orderId
// APPEND-ONLY: no updates or deletes permitted at service layer
```

#### `reservations`
```typescript
interface Reservation {
  id: string;
  orderId: string;
  skuId: string;
  binId: string;
  quantity: number;
  status: 'active' | 'released' | 'fulfilled';
  createdAt: string;      // ISO 8601
  lastActivityAt: string; // ISO 8601, reset on any order interaction
  releasedAt?: string;
  releaseReason?: 'timeout' | 'cancel' | 'fulfilled';
  version: number;
}
// Indexes: orderId, status, lastActivityAt
```

#### `files`
```typescript
interface FileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;         // hex-encoded hash
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;      // user ID
  isDeleted: boolean;
  version: number;
}
// Indexes: sha256, name, createdBy, isDeleted
```

#### `transfer_sessions`
```typescript
interface TransferSession {
  id: string;
  fileId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  totalChunks: number;
  completedChunks: number;
  chunkSize: number;      // 10485760 (10 MB)
  startedAt: string;
  updatedAt: string;
  version: number;
}
// Indexes: status, fileId
```

#### `vectors`
```typescript
interface EncryptedVector {
  id: string;
  profileId: string;
  encryptedData: string;  // AES-GCM encrypted, base64
  iv: string;             // base64
  modelVersion: string;
  extractedAt: string;
  version: number;
}
// Indexes: profileId
```

#### `queued_attempts`
```typescript
interface QueuedAttempt {
  id: string;
  notificationId: string;
  channel: 'sms' | 'email' | 'official_account';
  templateId: string;
  attemptNumber: number;  // 1, 2, or 3
  scheduledAt: string;    // ISO 8601
  status: 'pending' | 'simulated' | 'skipped';
  processedAt?: string;
  version: number;
}
// Indexes: notificationId, status, scheduledAt
```

#### `warehouses`
```typescript
interface Warehouse extends BaseEntity {
  name: string;
  code: string;            // unique
  parentId?: string;       // for sub-warehouses
  address?: string;
}
// Indexes: code (unique), parentId
```

#### `bins`
```typescript
interface Bin extends BaseEntity {
  warehouseId: string;
  code: string;
  zone: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  isActive: boolean;
}
// Indexes: warehouseId, code, zone
```

#### `skus`
```typescript
interface SKU extends BaseEntity {
  code: string;            // unique
  name: string;
  description?: string;
  category?: string;
  unit: string;
}
// Indexes: code (unique), category
```

#### `stock_records`
```typescript
interface StockRecord extends BaseEntity {
  binId: string;
  skuId: string;
  warehouseId: string;
  quantity: number;
  lastCountedAt?: string;
}
// Indexes: binId, skuId, warehouseId, [warehouseId, skuId] (compound)
```

#### `safety_stock_configs`
```typescript
interface SafetyStockConfig extends BaseEntity {
  warehouseId: string;
  skuId: string;
  threshold: number;       // default: 20
}
// Indexes: warehouseId, skuId, [warehouseId, skuId] (compound)
```

#### `orders`
```typescript
interface Order extends BaseEntity {
  orderNumber: string;     // unique
  status: OrderStatus;
  lines: OrderLine[];
  customerId?: string;
  notes?: string;
  createdBy: string;
}
// Indexes: orderNumber (unique), status, createdBy
```

#### `waves`
```typescript
interface Wave extends BaseEntity {
  waveNumber: string;
  status: WaveStatus;
  orderIds: string[];
  lineCount: number;
  config: WaveConfig;
  startedAt?: string;
  completedAt?: string;
}
// Indexes: status, waveNumber
```

#### `tasks`
```typescript
interface PickerTask extends BaseEntity {
  waveId: string;
  pickerId: string;
  status: TaskStatus;
  steps: PickPathStep[];
  assignedAt: string;
  completedAt?: string;
}
// Indexes: waveId, pickerId, status
```

#### `discrepancies`
```typescript
interface Discrepancy extends BaseEntity {
  taskId: string;
  orderId?: string;
  state: DiscrepancyState;
  reportedBy: string;
  reportedAt: string;
  description: string;
  attachments: DiscrepancyAttachment[];
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  resolvedAt?: string;
}
// Indexes: taskId, state, reportedBy
```

#### `chunks`
```typescript
interface FileChunk extends BaseEntity {
  fileId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  size: number;
}
// Indexes: fileId, chunkIndex
```

#### `versions`
```typescript
interface FileVersion extends BaseEntity {
  fileId: string;
  versionNumber: number;
  sha256: string;
  size: number;
  createdBy: string;
}
// Indexes: fileId, versionNumber
```

#### `recycle_bin`
```typescript
interface RecycleBinEntry extends BaseEntity {
  fileId: string;
  originalName: string;
  deletedBy: string;
  deletedAt: string;
  expiresAt: string;       // deletedAt + 30 days
}
// Indexes: fileId, expiresAt
```

#### `face_profiles`
```typescript
interface FaceProfile extends BaseEntity {
  name: string;
  groupId?: string;
  attributes: Record<string, string>;  // encrypted sensitive fields
  vectorId?: string;
  enrolledBy: string;
  enrolledAt: string;
}
// Indexes: groupId, name, enrolledBy
```

#### `capture_sessions`
```typescript
interface CaptureSession extends BaseEntity {
  profileId?: string;
  status: 'initializing' | 'capturing' | 'processing' | 'completed' | 'failed';
  deviceInfo?: string;
  startedAt: string;
  completedAt?: string;
}
// Indexes: profileId, status
```

#### `notifications`
```typescript
interface Notification extends BaseEntity {
  userId: string;
  eventType: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
}
// Indexes: userId, eventType, readAt
```

#### `subscriptions`
```typescript
interface Subscription extends BaseEntity {
  userId: string;
  eventType: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
}
// Indexes: userId, eventType
```

#### `read_receipts`
```typescript
interface ReadReceipt extends BaseEntity {
  notificationId: string;
  userId: string;
  readAt: string;
}
// Indexes: notificationId, userId
```

> **Total: 24 IndexedDB object stores.** All use `id` as keyPath. Full TypeScript definitions are in `src/lib/types/`. Repository classes are in `src/lib/db/repositories/`.

---

## 4. Import/Export Formats

### 4.1 Ledger CSV Export

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Entry UUID |
| `timestamp` | ISO 8601 | Movement timestamp |
| `operator` | string | Username of operator |
| `source_bin` | string | Source bin code or empty |
| `destination_bin` | string | Destination bin code or empty |
| `sku` | string | SKU identifier |
| `quantity` | integer | Units moved |
| `reason_code` | string | Movement reason enum value |
| `order_id` | string | Associated order or empty |
| `notes` | string | Free text notes or empty |

Encoding: UTF-8 with BOM. Line endings: CRLF. Header row included.

### 4.2 Profile JSON Export

```typescript
interface ProfileExport {
  formatVersion: "1.0";
  exportedAt: string;     // ISO 8601
  exportedBy: string;     // user ID
  profiles: Array<{
    id: string;
    name: string;
    group?: string;
    attributes: Record<string, string>;  // PII fields, decrypted for export
    vectorModelVersion?: string;
    // Note: vectors are NOT included in standard export for security
  }>;
}
```

### 4.3 Profile CSV Export

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Profile UUID |
| `name` | string | Display name |
| `group` | string | Group name or empty |
| `attribute_*` | string | Dynamic columns per attribute key |

### 4.4 Full Backup Archive (Administrator Only)

```typescript
interface BackupManifest {
  formatVersion: "1.0";
  createdAt: string;
  createdBy: string;
  appVersion: string;
  stores: Array<{
    name: string;         // IndexedDB store name
    recordCount: number;
    encrypted: boolean;   // true if store contains encrypted fields
  }>;
  checksums: Record<string, string>;  // SHA-256 per payload file
}
```

The backup is a structured JSON manifest plus per-store data files. Stores containing sensitive data are exported with encryption preserved (encrypted fields remain encrypted). The backup archive itself may be additionally encrypted with a user-provided password.

---

## 5. Notification Queue Records

### Event Types

| Event Type | Trigger | Default Channels |
|------------|---------|-----------------|
| `low_stock` | Stock falls below safety threshold | inbox |
| `wave_assigned` | Picker assigned to wave | inbox |
| `discrepancy_opened` | New discrepancy reported | inbox |
| `discrepancy_closed` | Discrepancy verified and resolved | inbox |
| `file_version_rollback` | File rolled back to prior version | inbox |

### Retry Schedule

| Attempt | Delay from previous |
|---------|-------------------|
| 1 (initial) | Immediate |
| 2 (retry 1) | 1 minute |
| 3 (retry 2) | 5 minutes |
| 4 (retry 3) | 15 minutes |

After 3 retries, the attempt is marked as `skipped` (external channels are audit-only, not actually sent). All attempts are logged for audit trail.

### Wall-Clock Reconciliation

If the app is closed during a retry window, the next app startup scans `queued_attempts` for records with `scheduledAt` in the past and `status: 'pending'`. These are processed in chronological order and marked with their actual processing timestamp.

---

## 6. Route/Module Event Contracts

Modules communicate through Svelte store subscriptions and a lightweight event bus pattern. Events are not persisted — they trigger service operations that persist their results.

### Event Patterns

| Event | Producer | Consumer(s) | Payload |
|-------|----------|-------------|---------|
| `stock:movement` | InventoryService | SafetyStockMonitor, OrderService | `{ binId, skuId, qty, reason }` |
| `stock:below-threshold` | SafetyStockMonitor | NotificationService | `{ warehouseId, skuId, current, threshold }` |
| `reservation:created` | OrderService | InventoryService | `{ orderId, skuId, binId, qty }` |
| `reservation:released` | OrderService / Timer | InventoryService | `{ reservationId, reason }` |
| `wave:assigned` | OrderService | NotificationService | `{ waveId, pickerId }` |
| `discrepancy:opened` | OrderService | NotificationService | `{ discrepancyId, taskId }` |
| `discrepancy:closed` | OrderService | NotificationService | `{ discrepancyId }` |
| `file:chunk-complete` | ChunkScheduler | FileService (UI update) | `{ sessionId, chunkIndex }` |
| `file:transfer-complete` | ChunkScheduler | FileService | `{ sessionId, fileId }` |
| `file:version-rollback` | FileService | NotificationService | `{ fileId, fromVersion, toVersion }` |
| `auth:locked` | IdleLockMonitor | AppLayout | `{}` |
| `auth:unlocked` | AuthService | AppLayout | `{ userId }` |
| `sync:invalidate` | BroadcastSync | All stores | `{ store, recordId? }` |
