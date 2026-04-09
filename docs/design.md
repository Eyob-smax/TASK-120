# ForgeOps Offline Warehouse & Identity Console — Design Document

## 1. Project Overview

ForgeOps Offline Warehouse & Identity Console is a pure frontend browser application built as an English-language Svelte + TypeScript single-page application (SPA). It serves warehouse teams who need to manage inventory, outbound fulfillment, and controlled access to sensitive files and identity records without any internet connection.

**There is no backend service.** All data and logic execute entirely within the browser using IndexedDB for structured data, LocalStorage for lightweight preferences, and WebCrypto for password hashing and field-level encryption.

### User Roles

| Role | Scope |
|------|-------|
| **Administrator** | Sets policies, manages users and templates, full access |
| **Warehouse Manager** | Oversees inventory, waves, discrepancies, operational management |
| **Picker/Packer** | Executes assigned pick/pack tasks, limited operational access |
| **Auditor** | Read-only access to ledgers, versions, and notification history |

---

## 2. Architecture Overview

The application follows a layered frontend architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Browser Tab                        │
├─────────────────────────────────────────────────────┤
│  Routes          (svelte-spa-router, hash-based)     │
│  ├── /dashboard, /inventory, /orders, /files, ...   │
├─────────────────────────────────────────────────────┤
│  Components      (DataTable, Drawer, Modal, ...)     │
│  ├── Reusable UI primitives shared across modules   │
├─────────────────────────────────────────────────────┤
│  Modules         (inventory, orders, files, ...)     │
│  ├── Domain UI, stores, validators, workflows       │
├─────────────────────────────────────────────────────┤
│  Service Layer   (optimistic updates, rollback)      │
│  ├── Orchestration, import/export, conflict resolve  │
├─────────────────────────────────────────────────────┤
│  Stores          (Svelte writable/readable stores)   │
│  ├── App-wide + module-specific reactive state       │
├─────────────────────────────────────────────────────┤
│  Persistence     (IndexedDB via idb, LocalStorage)   │
│  ├── Typed repos, migrations, transactions           │
├─────────────────────────────────────────────────────┤
│  Security        (WebCrypto cross-cutting concern)   │
│  ├── PBKDF2, AES-GCM, masking, idle lock            │
└─────────────────────────────────────────────────────┘
```

Data flows downward through the layers. UI events trigger service operations, which update stores and persist to IndexedDB. Stores reactively update bound components. The security layer is cross-cutting — it participates at the service layer (encryption/decryption), the store layer (masking), and the route layer (auth guards).

---

## 3. Offline Runtime Model

### Session Lifecycle

1. **Tab open**: Static SPA assets load from cache or local file serve. No network requests.
2. **First-run setup**: If no users exist in IndexedDB, a guarded setup route creates the initial Administrator account.
3. **Login**: PBKDF2 password verification. On success, derive AES-GCM master key and hold in memory.
4. **Active session**: Full app access per role permissions. Idle timer starts.
5. **Idle lock**: After 10 minutes without user interaction, the screen locks. In-memory keys are cleared. Unlock requires re-entering the password (re-derives keys).
6. **Tab close / logout**: All in-memory keys and session state are destroyed. Persisted encrypted data remains in IndexedDB for the next session.

### Multi-Tab Behavior

Multiple tabs may be open simultaneously. Coordination uses `BroadcastChannel` for store invalidation signals. IndexedDB transactions provide atomic write guarantees. Stale-write detection uses record version stamps — conflicting updates roll back and prompt the user.

### App Closed During Timed Operations

When the app is closed during timed operations (reservation expiry, notification retries, recycle bin expiry), the app reconciles on next startup by scanning for overdue timestamps and processing them in order.

---

## 4. Svelte SPA Composition and Route Layout

The UI uses a left navigation rail with hash-based routing via `svelte-spa-router`.

| Route | Module | Role Access | Description |
|-------|--------|-------------|-------------|
| `/#/` | app | All | Login / first-run setup |
| `/#/dashboard` | app | All authenticated | Main dashboard overview |
| `/#/inventory` | inventory | Admin, WM, Auditor | Inventory management, stock table |
| `/#/inventory/ledger` | inventory | Admin, WM, Auditor | Immutable movement ledger |
| `/#/orders` | orders | Admin, WM, Picker/Packer | Order list and management |
| `/#/orders/waves` | orders | Admin, WM | Wave planning and task assignment |
| `/#/files` | files | Admin, WM | File management, upload, preview |
| `/#/identity` | identity | Admin | Face enrollment, profiles |
| `/#/notifications` | notifications | All authenticated | Notification inbox |
| `/#/settings` | preferences | Admin (full), Others (own prefs) | App and user preferences |

### Navigation Rail Structure

```
┌──────┐ ┌──────────────────────────────────────┐
│ Logo │ │                                      │
│      │ │           Main Content Area           │
│ ──── │ │                                      │
│ Dash │ │   Table / Detail / Form / Drawer     │
│ Inv  │ │                                      │
│ Ord  │ │                                      │
│ File │ │                                      │
│ ID   │ │                                      │
│ Notif│ │                                      │
│      │ │                                      │
│ ──── │ │                                      │
│ Set  │ │                                      │
│ Lock │ │                                      │
└──────┘ └──────────────────────────────────────┘
```

---

## 5. IndexedDB and LocalStorage Responsibilities

### IndexedDB Stores

| Store | Key Path | Purpose | Sensitivity |
|-------|----------|---------|-------------|
| `users` | `id` | User accounts, role assignments, hashed passwords | High (hashed passwords, salts) |
| `warehouses` | `id` | Warehouse and sub-warehouse definitions | Low |
| `bins` | `id` | Bin locations within warehouses | Low |
| `stock_records` | `id` | Current stock per SKU per bin | Low |
| `movement_ledger` | `id` | Immutable movement history (append-only) | Low |
| `orders` | `id` | Order records with status lifecycle | Low |
| `reservations` | `id` | Stock reservations with expiry timestamps | Low |
| `waves` | `id` | Wave planning records | Low |
| `tasks` | `id` | Picker/packer task assignments | Low |
| `discrepancies` | `id` | Discrepancy records with state machine | Low |
| `files` | `id` | File metadata records | Low |
| `chunks` | `id` | File chunk storage | Low |
| `transfer_sessions` | `id` | Resumable transfer state | Low |
| `versions` | `id` | File version records (retain last 10) | Low |
| `recycle_bin` | `id` | Soft-deleted files with expiry | Low |
| `face_profiles` | `id` | Identity profiles and group memberships | High (encrypted vectors) |
| `capture_sessions` | `id` | Enrollment capture metadata | Medium |
| `vectors` | `id` | Encrypted feature vectors | High (AES-GCM encrypted) |
| `notifications` | `id` | In-app inbox items | Low |
| `queued_attempts` | `id` | External channel attempt audit log | Low |
| `subscriptions` | `id` | Per-user event type preferences | Low |
| `read_receipts` | `id` | Notification read timestamps | Low |

### LocalStorage Keys

| Key Pattern | Purpose | Cap | Sensitivity |
|-------------|---------|-----|-------------|
| `forgeops:columns:<tableId>` | Column visibility and order per table | None | None |
| `forgeops:filters:<screenId>` | Last-used filter state per screen | None | None |
| `forgeops:search:history` | Global search history entries | 50 entries | None |
| `forgeops:prefs:<userId>` | User-specific UI preferences | None | None |

**No sensitive data is stored in LocalStorage.** All PII, credentials, encryption keys, and identity data are stored in IndexedDB with AES-GCM encryption.

---

## 6. WebCrypto Usage

### PBKDF2 Password Hashing

| Parameter | Value |
|-----------|-------|
| Algorithm | PBKDF2 |
| Hash function | SHA-256 |
| Iterations | 600,000 |
| Salt | 128-bit, per-user, crypto.getRandomValues |
| Output | 256-bit derived key material |

On login, the entered password is hashed with the stored salt and compared to the stored hash. On match, the same password derives the master encryption key.

### AES-GCM Field Encryption

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| Key size | 256-bit |
| IV | 96-bit, random per encryption operation |
| Tag length | 128-bit (default) |

### Key Lifecycle

1. **Account creation**: Generate a random Data Encryption Key (DEK). Derive a Key Encryption Key (KEK) from the password via PBKDF2. Wrap the DEK with the KEK. Store the wrapped DEK, salt, and IV in IndexedDB.
2. **Login / unlock**: Re-derive KEK from password. Unwrap the DEK. Hold unwrapped DEK in memory only.
3. **Encrypt/decrypt**: Use the in-memory DEK for AES-GCM operations on sensitive fields.
4. **Lock / logout / tab close**: Clear the in-memory DEK. Only encrypted data remains in IndexedDB.

### What Gets Encrypted

- Face feature vectors
- Identity attributes (configurable per field)
- File encryption keys (files themselves may optionally be encrypted)

---

## 7. File Transfer Orchestration Model

### Ingestion Pipeline

```
File selected
    │
    ▼
Compute SHA-256 hash (streaming, chunked read)
    │
    ▼
Dedup check: hash exists in files store?
    ├── YES → Create new metadata/version reference → Done (instant)
    │
    ├── NO ▼
    Create transfer session record
    │
    ▼
Slice file into 10 MB chunks
    │
    ▼
Schedule concurrent writes (max 3 active)
    │── Bandwidth cap: token-bucket scheduler limits bytes/interval
    │── On pause: persist session state, halt scheduling
    │── On resume: reload session, continue from next unwritten chunk
    │── On error: retry chunk, mark session for user attention
    │
    ▼
All chunks written → Complete manifest → Create file record
```

### Bandwidth Throttling

A token-bucket scheduler at the service layer meters chunk read/write operations. The user-configured bandwidth cap (e.g., 5 MB/s) sets the token refill rate. This is an application-managed throughput target, not a kernel-level bandwidth guarantee. The implementation documents this limitation clearly.

### Transfer States

`pending` → `active` → `paused` | `completed` | `failed`

Transfer session records persist in IndexedDB so they survive tab close and can be resumed.

---

## 8. Face Capture and Quality/Liveness Flow

### Sequential Flow

1. **Camera initialization**: Request `MediaDevices.getUserMedia` with `{ video: { width: { min: 1280 }, height: { min: 720 } } }`.
2. **Resolution check**: Verify video track settings meet 720p minimum. Reject with guidance if insufficient.
3. **Frame capture**: Draw video frame to offscreen canvas.
4. **Brightness analysis**: Compute mean luminance from pixel data. Reject if outside calibrated range (Administrator-configurable thresholds).
5. **Occlusion detection**: Analyze frame for heavy occlusion indicators. Reject with specific guidance.
6. **Liveness prompt**: Display "Blink and turn" instructions. Capture timed frames over a short interval. Analyze frame sequence for expected motion patterns.
7. **Feature vector extraction**: Run in-browser extraction model (packaged with build). Output: fixed-length numeric vector.
8. **Encryption**: Encrypt vector with user's DEK via AES-GCM. Store encrypted vector, model version, extraction timestamp, and IV in IndexedDB.

### Quality Check Thresholds (Administrator-Configurable)

| Check | Default | Configurable |
|-------|---------|--------------|
| Minimum resolution | 1280x720 | Yes |
| Brightness range | 40-220 (0-255 scale) | Yes |
| Occlusion rejection | Score > 0.7 | Yes |
| Liveness frame count | 5 frames over 3 seconds | Yes |

**Disclosure**: The feature-vector generation is an on-device application feature for local identity records. It is not a certified biometric verification system.

---

## 9. Optimistic Update and Rollback Strategy

### Pattern

1. **User action**: User initiates an operation (e.g., transfer stock between bins).
2. **Optimistic store update**: The Svelte store is immediately updated with the expected result. UI reflects the change instantly.
3. **Service layer persistence**: The service writes the change to IndexedDB within a transaction. Validation rules are enforced at this layer.
4. **Success**: No further action. The optimistic state matches persisted state.
5. **Failure / validation error**: The service signals failure. The store rolls back to the previous snapshot. The UI shows an error notification with the reason. The user can retry or take corrective action.

### Version Stamping

Each record carries a `version` field (monotonically incrementing integer). Before persisting, the service checks that the record's version in IndexedDB matches the version the UI was working from. If they diverge (another tab modified it), the write is rejected and the store reloads from IndexedDB.

### Multi-Tab Coordination

On successful write, the writing tab broadcasts an invalidation signal on `BroadcastChannel('forgeops-sync')`. Other tabs receive the signal, reload the affected store slice from IndexedDB, and re-render.

---

## 10. Permission-Aware Masking and Role Boundaries

### Field Visibility Matrix

| Data Field | Administrator | Warehouse Manager | Picker/Packer | Auditor |
|-----------|---------------|-------------------|---------------|---------|
| User full name | Visible | Visible | Own only | Masked |
| User email | Visible | Masked/reveal | Hidden | Masked |
| Face vector data | Reveal with action | Hidden | Hidden | Hidden |
| Identity attributes | Reveal with action | Masked/reveal (limited) | Hidden | Masked |
| File encryption key metadata | Visible | Hidden | Hidden | Hidden |
| Movement ledger entries | Visible | Visible | Own tasks only | Visible |
| Notification history | Visible | Own + team | Own only | Visible |
| Order details | Visible | Visible | Assigned only | Visible |
| System settings | Visible | Read-only | Hidden | Read-only |

### Reveal Permissions

| Capability | Roles |
|-----------|-------|
| `identity.reveal_basic` | Administrator, Warehouse Manager |
| `identity.reveal_sensitive` | Administrator |
| `files.reveal_key_metadata` | Administrator |
| `users.reveal_contact` | Administrator |

### Masking Flow

1. Component requests field value from store.
2. Store checks `authStore` for current user's role and permissions.
3. If field requires masking for this role, return masked placeholder (e.g., `••••••••`).
4. On click-to-reveal, check `PermissionChecker` for the specific reveal capability.
5. If authorized, decrypt (if encrypted) and return plaintext for display.
6. Reveal is temporary — navigating away or locking re-masks the field.

---

## 11. Requirement Traceability Table

| Req ID | Domain | Description | Module(s) | Source Path(s) | Prompt | Test Area |
|--------|--------|-------------|-----------|----------------|--------|-----------|
| R-INV-01 | Inventory | Multi-warehouse and sub-warehouse bins | inventory | `modules/inventory/` | P2, P4 | Model validation |
| R-INV-02 | Inventory | Inbound, outbound, cycle counts, transfers | inventory | `modules/inventory/` | P4 | Movement logic |
| R-INV-03 | Inventory | Safety stock 20/SKU/warehouse, alerts | inventory, notifications | `modules/inventory/`, `modules/notifications/` | P4, P7 | Threshold check, alert creation |
| R-INV-04 | Inventory | Immutable movement ledger | inventory | `modules/inventory/`, `lib/db/` | P2, P4 | Append-only enforcement |
| R-ORD-01 | Orders | Reserve stock at creation | orders, inventory | `modules/orders/` | P4 | Reservation logic |
| R-ORD-02 | Orders | Auto-release 30 min or on cancel | orders | `modules/orders/` | P4 | Timer expiry, edge cases |
| R-ORD-03 | Orders | Wave planning, 25 lines default | orders | `modules/orders/` | P4 | Wave sizing |
| R-ORD-04 | Orders | Pick-path: zone then bin alpha | orders | `modules/orders/` | P4 | Sort algorithm |
| R-ORD-05 | Orders | Discrepancy verification before pack | orders | `modules/orders/` | P4 | State transitions |
| R-FILE-01 | Files | Chunked resumable, 10MB, max 3 concurrent | files | `modules/files/` | P4 | Chunk orchestration |
| R-FILE-02 | Files | SHA-256 dedup, instant upload | files | `modules/files/`, `lib/security/` | P4 | Hash + dedup |
| R-FILE-03 | Files | Version rollback, retain last 10 | files | `modules/files/` | P4 | Retention logic |
| R-FILE-04 | Files | Recycle bin, 30-day retention | files | `modules/files/` | P4 | Expiry calculation |
| R-FILE-05 | Files | Local preview: images, PDF, text, A/V | files | `modules/files/`, `components/` | P6 | Preview rendering |
| R-FILE-06 | Files | User-set bandwidth cap | files | `modules/files/` | P4 | Throttle scheduler |
| R-ID-01 | Identity | Webcam face enrollment | identity | `modules/identity/` | P4, P6 | Capture flow |
| R-ID-02 | Identity | Quality: 720p, brightness, occlusion | identity | `modules/identity/` | P4 | Quality validators |
| R-ID-03 | Identity | Liveness: blink-and-turn timed frames | identity | `modules/identity/` | P4 | State machine |
| R-ID-04 | Identity | Feature vector, encrypted storage | identity | `modules/identity/`, `lib/security/` | P3, P4 | Encryption round-trip |
| R-ID-05 | Identity | Bulk import/export JSON/CSV | identity | `modules/identity/` | P4, P6 | Format parsing |
| R-SEC-01 | Security | PBKDF2 pseudo-login, per-user salt | security | `lib/security/` | P3 | Hash verification |
| R-SEC-02 | Security | 10-minute idle auto-lock | security | `lib/security/`, `app/` | P3 | Timer logic |
| R-SEC-03 | Security | AES-GCM encrypted sensitive fields | security | `lib/security/` | P3 | Encrypt/decrypt |
| R-SEC-04 | Security | PII masking, click-to-reveal | security | `lib/security/`, `components/` | P3, P6 | Permission check |
| R-SEC-05 | Security | Role-based access: 4 roles | security | `lib/security/`, `app/` | P3 | Role matrix |
| R-NOT-01 | Notifications | In-app inbox items | notifications | `modules/notifications/` | P7 | Item creation |
| R-NOT-02 | Notifications | External channels as templates + queue | notifications | `modules/notifications/` | P7 | Queue logic |
| R-NOT-03 | Notifications | Retry at 1, 5, 15 minutes | notifications | `modules/notifications/` | P7 | Retry scheduling |
| R-NOT-04 | Notifications | Subscription prefs per event type | notifications | `modules/notifications/` | P7 | Subscription CRUD |
| R-NOT-05 | Notifications | Read receipts | notifications | `modules/notifications/` | P7 | Receipt recording |
| R-PREF-01 | Preferences | Column layouts, filters in LocalStorage | preferences | `modules/preferences/` | P2, P6 | Serialization |
| R-PREF-02 | Preferences | Search history capped at 50 | preferences | `modules/preferences/` | P2 | Cap enforcement |
| R-EXP-01 | Import/Export | File pickers, Blob downloads | services | `lib/services/` | P4, P6 | Export generation |
| R-EXP-02 | Import/Export | Ledger CSV export | inventory | `modules/inventory/` | P6 | CSV format |
| R-UI-01 | UI | Left navigation rail | app | `app/`, `components/` | P5 | Nav rendering |
| R-UI-02 | UI | Tables, filter chips, global search | components | `components/` | P5, P6 | Table interactions |
| R-UI-03 | UI | Drawers and modals | components | `components/` | P5 | Open/close lifecycle |
| R-SVC-01 | Services | Optimistic updates with rollback | services | `lib/services/` | P3, P4 | Rollback mechanism |

---

## 12. Technology Decisions and Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Svelte 4 | Stable release, mature tooling and testing library support. Svelte 5 runes are production-ready but ecosystem support is less proven for large projects. |
| Build tool | Vite 5 | Fast HMR, native ES module support, built-in Vitest integration, excellent Svelte plugin. |
| Router | svelte-spa-router | Lightweight hash-based routing. No SSR assumptions, works fully offline. Avoids SvelteKit complexity and server-side concerns. |
| IndexedDB wrapper | idb (^8.0.0) | Promise-based typed API, versioned migration support, minimal footprint (~3KB gzipped). |
| Test framework | Vitest | Native Vite integration, compatible globals mode, fast execution, v8 coverage. |
| Component testing | @testing-library/svelte | Encourages accessible, user-focused testing patterns. |
| Path aliases | `$` prefix (`$lib/`, `$modules/`) | Mirrors SvelteKit convention for familiarity. Configured in both tsconfig and vite.config.ts. |
| Module resolution | `moduleResolution: "bundler"` | Correct for Vite-based projects, avoids Node.js resolution assumptions. |
| IndexedDB test shim | fake-indexeddb (^6.0.0) | Provides realistic IndexedDB environment in jsdom for repository tests. |

---

## 13. Data-Flow Descriptions (Added in Prompt 2)

### 13.1 Reservation Timing Data Flow

1. **Order creation**: `OrderService.createOrder()` creates `Reservation` records with `status: active` and `lastActivityAt` set to the current timestamp.
2. **Activity tracking**: Any interaction with the order (line edits, status updates, user views) updates `lastActivityAt` on all associated active reservations.
3. **Expiry evaluation**: `isReservationExpired(lastActivityAt, now)` is a pure function that returns `true` when `now - lastActivityAt > 30 minutes` (1,800,000 ms). The check uses `>` (strict greater-than), meaning exactly 30 minutes is not expired.
4. **Periodic scan**: On app bootstrap and on a periodic timer during active sessions, `getExpiredReservations()` scans all active reservations and returns those past timeout.
5. **Release**: Expired reservations transition to `status: released`, `releaseReason: timeout`. The reserved stock is returned to available inventory via a `reservation_release` movement entry in the immutable ledger.
6. **Cancel**: On order cancellation, all active reservations for that order are immediately released with `releaseReason: cancel`.
7. **Wall-clock reconciliation**: If the app was closed during a timeout window, the next startup scan catches all overdue reservations and processes them in chronological order.

### 13.2 Discrepancy Verification Data Flow

State machine: `opened` → `under_review` → `verified` → `resolved`

1. **Opened**: A picker reports a discrepancy via `reportDiscrepancy()`. State is `opened`. Required fields: `taskId`, `reportedBy`, `description`. Optional: attachments (photo/file via `DiscrepancyAttachment`), notes.
2. **Under Review**: A warehouse manager or administrator moves the discrepancy to `under_review`. Additional notes and attachments may be added.
3. **Verified**: The discrepancy is verified with `verifiedBy`, `verifiedAt`, and `verificationNotes` required. This step is mandatory before packing can proceed.
4. **Resolved**: After verification, the discrepancy is resolved. `resolvedAt` is recorded. Packing actions for the associated task are now unblocked.
5. **Packing guard**: The packing workflow checks for open/unverified discrepancies on the task. If any exist in states `opened` or `under_review`, packing is blocked.

### 13.3 Version Rollback Data Flow

1. **Version creation**: Each file upload or update creates a new `FileVersion` record with an incrementing `versionNumber`.
2. **Retention enforcement**: After each new version, `enforceVersionLimit(versions, 10)` sorts by `versionNumber` descending and returns `{ keep, remove }`. The `remove` set is deleted from IndexedDB. The `keep` set always includes the 10 most recent versions.
3. **Rollback**: `FileService.rollbackVersion(fileId, targetVersionId)` creates a new `FileVersion` record that points to the content of the target version. The file's `currentVersionId` is updated. This means rollback does not delete newer versions — it creates a new version entry pointing to older content.
4. **Notification**: A `file_version_rollback` event is emitted, which creates an inbox notification for subscribed users.

### 13.4 Recycle-Bin Expiry Data Flow

1. **Soft delete**: `FileService.deleteFile(fileId)` marks the file record as `isDeleted: true` and creates a `RecycleBinEntry` with `deletedAt` and `expiresAt` (= deletedAt + 30 days).
2. **Expiry check**: `isRecycleBinExpired(deletedAt, now)` returns `true` when `now - deletedAt > 2,592,000,000 ms` (30 days). Uses strict `>`.
3. **Startup reconciliation**: On app bootstrap, `getExpiredRecycleBinEntries()` scans all entries and returns those past retention.
4. **Permanent deletion**: Expired entries are permanently removed: the `RecycleBinEntry`, associated `FileChunk` records, and the `FileRecord` itself are deleted from IndexedDB.
5. **Restore**: Before expiry, `FileService.restoreFile(entryId)` removes the `RecycleBinEntry` and sets `isDeleted: false` on the file record.

### 13.5 Encrypted Field Persistence Boundary

The encryption/decryption boundary sits at the **service layer**, not the repository layer.

1. **Write path**: The service layer encrypts sensitive fields (face vectors, identity attributes) using AES-GCM with the user's in-memory DEK before passing the record to the repository. The repository stores the ciphertext, IV, and metadata without awareness of encryption.
2. **Read path**: The repository returns records with encrypted fields as-is. The service layer decrypts using the in-memory DEK before returning data to stores or components.
3. **Repository transparency**: Repositories never decrypt data. They treat encrypted fields as opaque strings/blobs. This means repository tests work without crypto setup.
4. **Key unavailability**: When the screen is locked or the user is logged out, the in-memory DEK is cleared. Service calls that require decryption return masked/placeholder values or throw errors. The persisted encrypted data remains intact in IndexedDB.

---

## 14. Security Implementation (Added in Prompt 3)

### 14.1 Authentication Service Lifecycle

The auth service (`src/lib/security/auth.service.ts`) manages the complete authentication lifecycle:

1. **Bootstrap**: `bootstrap()` checks if any users exist in IndexedDB. Returns `{ isFirstRun: true }` on empty database.
2. **First-run setup**: `createInitialAdmin(username, password, profile)` creates the first Administrator. Only works when zero users exist. Generates salt, hashes password via PBKDF2, generates DEK, wraps DEK with password-derived KEK.
3. **Login**: `login(username, password)` verifies PBKDF2 hash, derives KEK, unwraps DEK, stores both session and DEK in module-level memory. Returns `Session` object.
4. **Logout**: `logout()` clears both `currentSession` and `currentDEK` from memory.
5. **Lock**: `lock()` sets `session.isLocked = true` and clears `currentDEK`. Session identity is retained for unlock.
6. **Unlock**: `unlock(password)` re-verifies password, re-derives KEK, re-unwraps DEK, restores `isLocked = false`.

Module-level state (`currentSession`, `currentDEK`) is **never persisted** and **never serialized**. It exists only in the browser tab's JavaScript memory.

### 14.2 Idle Lock Monitor

`IdleLockMonitor` (`src/lib/security/idle-monitor.ts`) listens on `document` for user activity events (mousemove, mousedown, keydown, touchstart, scroll). After `IDLE_LOCK_TIMEOUT_MS` (600,000ms = 10 minutes) without activity, fires the `onLock` callback. Lifecycle is explicit: `start()` / `stop()` for Svelte component integration.

### 14.3 Role-Based Access Control

Implemented in `src/lib/security/permissions.ts`:

- **ROUTE_ACCESS**: Maps 10 routes to allowed `UserRole[]`. PickerPacker has no access to `/files` or `/identity`. Auditor has no access to `/identity`.
- **MUTATION_ACCESS**: Maps 20 mutation actions to allowed roles. Auditor has no mutation access at all.
- **PERMISSION_MATRIX**: Maps 4 reveal capabilities to roles per design.md Section 10.
- **Functions**: `canAccess()`, `canMutate()`, `canReveal()`, `isReadOnly()`.

### 14.4 PII Masking

Implemented in `src/lib/security/masking.ts`:

- `MASKED_FIELDS` maps field names to `{ maskFor: UserRole[], revealCapability }`.
- `maskValue(value, type)` returns masked placeholders: `••••@••••` for email, `••••••` for names, `••••••••` for default.
- `shouldMask(field, role)` checks if a field should be masked for a given role.
- `canRevealField(field, role)` checks if a role has the reveal capability for click-to-reveal.

### 14.5 Svelte Stores

- **authStore** (`src/lib/stores/auth.store.ts`): Writable `Session | null` with derived `isAuthenticated`, `isLocked`, `currentRole` readables.
- **appStore** (`src/lib/stores/app.store.ts`): Writable `{ loading, error, sidebarCollapsed, initialized }` with helper functions.

### 14.6 Service Error Hierarchy

Defined in `src/lib/services/errors.ts`:

| Error Class | Code | Use |
|------------|------|-----|
| `ServiceError` | (custom) | Base class |
| `AuthenticationError` | `AUTHENTICATION_FAILED` | Login/unlock failures |
| `AuthorizationError` | `AUTHORIZATION_DENIED` | Permission violations |
| `ValidationServiceError` | `VALIDATION_FAILED` | Business rule violations |
| `ConflictError` | `VERSION_CONFLICT` | Optimistic concurrency failures |

`toValidationResult(error)` converts any `ServiceError` to the standard `ValidationResult` format.

### 14.7 Logging

`createLogger(category)` in `src/lib/logging/logger.ts` returns a logger with `debug/info/warn/error` methods. All logged arguments are recursively sanitized via `sanitize()` which replaces values of sensitive field names (`password`, `salt`, `hash`, `dek`, `iv`, `encryptedData`, `wrappedDEK`, `dekIV`, `ciphertext`, `key`, `secret`) with `[REDACTED]`.

### 14.8 App Bootstrap

`initApp()` in `src/app/init.ts` runs the sequential startup: `initDatabase()` → `bootstrap()` → `BroadcastSync` → `setInitialized()`. Returns `{ isFirstRun }` for the UI to decide whether to show setup or login.

---

## 15. Core Engine Flows (Added in Prompt 4)

### 15.1 Inventory Movement Flow

Every stock-changing operation follows: **validate → update stock → write immutable ledger → check safety stock**.

1. **Receive**: Validate inputs → create/find StockRecord → add quantity → write ledger with `MovementReason.Receive` (destinationBinId set, sourceBinId null) → check safety stock.
2. **Ship**: Validate inputs → verify sufficient stock → deduct quantity → write ledger with `MovementReason.Ship` (sourceBinId set) → check safety stock. Throws `insufficient_stock` if stock < requested.
3. **Transfer**: Validate same-bin rejection → verify source stock → deduct source → add destination → write TWO ledger entries (`TransferOut` + `TransferIn`) → check safety stock for both warehouses.
4. **Cycle Count**: Compare actual vs recorded → adjust stock → write ledger with `CycleCountAdjust` only if difference exists (no ledger entry for matching counts).

Safety stock is checked after every operation and returns `SafetyStockAlert[]` for each SKU below its threshold (default 20).

### 15.2 Order Reservation Lifecycle

1. **Create Order**: Validate lines → for each line with a binId, verify stock ≥ quantity → deduct stock → create `Reservation` (status: active) → write `ReservationHold` ledger entry → set order status to `Reserved`.
2. **Cancel Order**: Release ALL active reservations → return stock → write `ReservationRelease` ledger entries with `ReleaseReason.Cancel` → set order status to `Cancelled`.
3. **Auto-Release (30 min)**: `releaseExpiredReservations(now)` scans active reservations where `now - lastActivityAt > RESERVATION_TIMEOUT_MS` → releases each with `ReleaseReason.Timeout` → returns stock → writes ledger entries.
4. **Activity Update**: Any order interaction calls `updateOrderActivity(orderId)` → updates `lastActivityAt` on all active reservations → resets the 30-minute countdown.

### 15.3 Wave Planning & Task Assignment

1. **Plan Wave**: Gather orders by ID → count total lines → enforce `maxLinesPerWave` (default 25) → create Wave with `WaveStatus.Planned`.
2. **Assign Task**: Gather pick steps from wave's order lines → sort via `sortPickPath(steps, config)` (zone priority then bin alpha) → create `PickerTask` with `TaskStatus.Assigned` and sequenced steps.
3. **Start Wave**: Validate status is `Planned` → set to `InProgress` with `startedAt` timestamp.
4. **Complete Wave**: Validate all tasks have `TaskStatus.Completed` → set wave to `Completed` with `completedAt` timestamp.

### 15.4 Discrepancy Verification State Machine

```
opened → under_review → verified → resolved
```

- **Report**: Create with `DiscrepancyState.Opened`, required: taskId, reportedBy, description. Optional: attachments, orderId.
- **Review**: Transition to `UnderReview`. Optional notes.
- **Verify**: Transition to `Verified`. Required: verifiedBy, verificationNotes. Records verifiedAt. Optional: additional attachments.
- **Resolve**: Transition to `Resolved`. Records resolvedAt.
- **Packing Guard**: `canProceedToPacking(taskId)` returns `true` only if ALL discrepancies for the task are in `Verified` or `Resolved` state. Returns `true` if no discrepancies exist.

Invalid transitions throw `ValidationServiceError` with code `invalid_transition`.

### 15.5 File Transfer Orchestration

1. **Ingest**: Compute SHA-256 via `crypto.subtle.digest` → check dedup (if hash exists and file active, return existing file as deduplicated) → create `FileRecord` → create `TransferSession` with `totalChunks = ceil(size / 10MB)`.
2. **Chunk Scheduling**: `ChunkScheduler` processes up to `MAX_CONCURRENT_CHUNKS` (3) simultaneously using a promise pool → each chunk is validated for size → stored in `ChunkRepository` → session progress updated.
3. **Bandwidth Throttle**: Token-bucket pattern: `minInterval = chunkSize / capBytesPerSecond * 1000`. If elapsed time since last chunk is less than minInterval, delay the difference.
4. **Pause/Resume**: Pause sets session status to `Paused` (scheduler stops processing). Resume sets to `Active` (scheduler can continue from incomplete chunks).
5. **Complete**: Verify all chunks present → set session to `Completed`.

### 15.6 File Version & Recycle Bin

- **Version Creation**: New version with incrementing number → `enforceVersionLimit()` removes excess beyond 10 → update file's `currentVersionId`.
- **Rollback**: Creates a NEW version with the target version's sha256/size → does not delete any versions → the rollback itself is versioned.
- **Soft Delete**: Set `isDeleted = true` → create `RecycleBinEntry` with `expiresAt = deletedAt + 30 days`.
- **Restore**: Remove `RecycleBinEntry` → set `isDeleted = false`.
- **Purge**: On startup/periodic sweep, `purgeExpired()` removes entries past 30-day retention along with their chunks and file records.

---

## 16. Application Shell Architecture (Added in Prompt 5)

### 16.1 SPA Shell Composition

The app shell in `src/App.svelte` composes:
- **Router**: `svelte-spa-router` hash-based routing with 11 route paths + wildcard 404
- **NavRail**: Left navigation rail, permission-filtered via `canAccess(role, route)`, collapsible
- **TopBar**: Global search bar with search history (capped at 50 entries via `SearchHistory`)
- **ToastContainer**: Manages toast notification stack via Svelte `setContext`/`getContext`
- **LockScreen**: Full-screen overlay when `isLocked` is true, blocks interaction until password unlock
- **IdleLockMonitor**: Started when authenticated, stopped on logout. Fires `lock()` after 10 minutes idle

### 16.2 Route Map

| Path | Component | Nav | Access |
|------|-----------|-----|--------|
| `/#/` | Login | No | Public |
| `/#/dashboard` | Dashboard | Yes | All authenticated |
| `/#/inventory` | Inventory | Yes | Admin, WM, Auditor |
| `/#/inventory/ledger` | Ledger | No | Admin, WM, Auditor |
| `/#/orders` | Orders | Yes | Admin, WM, Picker |
| `/#/orders/waves` | Waves | No | Admin, WM |
| `/#/files` | Files | Yes | Admin, WM |
| `/#/identity` | Identity | Yes | Admin only |
| `/#/notifications` | Notifications | Yes | All authenticated |
| `/#/settings` | Settings | Yes | All authenticated |
| `*` | NotFound | No | All |

### 16.3 Route Guard

`checkRouteAccess(path)` in `src/app/route-guard.ts` checks:
1. Public routes (`/`) always accessible
2. Non-public routes require `isAuthenticated === true` (session exists and not locked)
3. `canAccess(currentRole, path)` must return true

On failure, `handleRouteFailure` redirects: unauthenticated → `/`, unauthorized → `/dashboard`.

### 16.4 Reusable Component Library

| Component | Purpose |
|-----------|---------|
| `NavRail` | Left navigation, permission-filtered, collapsible |
| `SearchBar` | Global search with history dropdown (LocalStorage) |
| `DataTable` | Sortable columns, pagination, loading/empty states |
| `FilterChip` | Removable filter tag |
| `Drawer` | Right slide-out panel, escape/overlay close |
| `Modal` | Centered dialog, confirm/cancel, escape close |
| `LoadingSpinner` | Centered spinner with message |
| `EmptyState` | Empty data placeholder with action button |
| `ErrorBanner` | Dismissible error bar |
| `Toast` | Auto-dismiss notification (success/error/warning/info) |
| `ToastContainer` | Toast stack manager via Svelte context |
| `MaskedField` | PII masking with click-to-reveal (role-aware) |
| `LockScreen` | Full-screen lock overlay with password unlock |
| `PageHeader` | Page title with action button slot |

### 16.5 Preference Persistence

| Manager | Storage Key | Purpose |
|---------|------------|---------|
| `ColumnLayoutManager` | `forgeops:columns:<tableId>` | Column visibility/order per table |
| `FilterStateManager` | `forgeops:filters:<screenId>` | Last-used filter state per screen |
| `SearchHistory` | `forgeops:search:history` | Search queries, FIFO, capped at 50 |

All use `PreferenceStorage` (LocalStorage wrapper with `forgeops:` prefix and JSON serialization).

---

## 17. Primary Workflow Screens (Added in Prompt 6)

### 17.1 Screen Map

| Screen | Route | Key Actions | Service Integration |
|--------|-------|-------------|-------------------|
| Dashboard | `/dashboard` | View summaries, recent activity | All stores loaded, safety stock check |
| Inventory | `/inventory` | Receive, Ship, Transfer, Cycle Count (via Modals) | `receiveStock`, `shipStock`, `transferStock`, `cycleCount` |
| Ledger | `/inventory/ledger` | Filter, Export CSV | `loadLedger`, Blob export |
| Orders | `/orders` | Create Order (Drawer), Cancel, Release Expired | `createOrder`, `cancelOrder`, `releaseExpiredReservations` |
| Waves | `/orders/waves` | Plan Wave (Modal), Start, Complete, Discrepancy Drawer | `planWave`, `startWave`, `completeWave`, discrepancy state machine |
| Files | `/files` | Upload (Modal), Versions (Drawer), Delete, Recycle Bin | `ingestFile`, `deleteFile`, `rollbackToVersion`, `restoreFile` |
| Identity | `/identity` | Import/Export profiles (JSON/CSV) | `FaceProfileRepository`, Blob import/export |
| Notifications | `/notifications` | Mark read, Filter by type, Subscription settings | `NotificationRepository`, subscription toggles |
| Settings | `/settings` | User Management (Admin), Safety Stock Thresholds | `createUser`, `SafetyStockConfigRepository` |

### 17.2 Role-to-Workflow Matrix

| Workflow | Admin | WM | Picker | Auditor |
|----------|-------|----|--------|---------|
| Inventory CRUD | Full | Full | Count only | Read-only |
| Order create/cancel | Full | Full | No | No |
| Wave plan/assign | Full | Full | No | No |
| Pick/pack tasks | Full | Full | Full | No |
| Discrepancy report | Full | Full | Full | No |
| Discrepancy verify/resolve | Full | Full | No | No |
| File upload/delete | Full | Full | No | No |
| Identity import/export | Full | No | No | No |
| User management | Full | No | No | No |
| Safety stock settings | Full | No | No | No |
| View ledger/history | Full | Full | Own tasks | Full |

### 17.3 Action Modal/Drawer Pattern

Every action form is a separate Svelte component in `src/routes/<module>/`:
1. Form opens in a `Modal` or `Drawer` from the reusable component library
2. Form fields bind to local state variables
3. Submit calls the real service function (e.g., `receiveStock()`)
4. On success: refreshes the store, shows toast, closes modal
5. On error: displays inline error message, does not close
6. Role checks via `canMutate(role, action)` determine whether action buttons render

### 17.4 Feedback States

- **Loading**: `LoadingSpinner` during data fetch
- **Empty**: `EmptyState` when no records
- **Error**: Inline `form-error` div in modals, `ErrorBanner` at page level
- **Success**: Toast via `ToastContainer` context
- **Safety stock**: `AlertBanner` with count + details
- **Read-only**: Auditor sees no action buttons, settings shows read-only notice
- **Dedup**: Upload modal shows dedup notice when file already exists
- **Transfer progress**: `ProgressBar` during file upload

---

## 18. Secondary Modules (Added in Prompt 7)

### 18.1 Notification Engine

The notification service (`src/modules/notifications/notification.service.ts`) implements:

- **Inbox items**: `createInboxItem()` writes to IndexedDB `notifications` store.
- **Read receipts**: `markAsRead()` updates notification `readAt` and creates a `ReadReceipt` record.
- **External channel audit**: `queueExternalAttempt()` creates a `QueuedAttempt` with `status: pending`. External channels (SMS/email/official-account) are **audit-only** — messages are never actually sent.
- **Retry processing**: `processRetries(now)` scans overdue pending attempts, marks them as `simulated` (not delivered), and schedules the next retry at 1/5/15 minute intervals. After 3 attempts, the final one is marked `skipped`.
- **Subscriptions**: Per-event-type preferences via `subscription.service.ts`. Default: all event types subscribed to inbox channel.
- **Templates**: `template.service.ts` provides `DEFAULT_TEMPLATES` for all 5 event types, seeded on first use.

### 18.2 Startup Reconciliation

`reconcileOnStartup(now)` in `src/lib/services/reconciliation.ts` runs sequentially on app boot (after `initDatabase`, before `setInitialized`):

1. **Release expired reservations**: Catches reservations that expired while the app was closed.
2. **Purge expired recycle bin**: Removes entries past 30-day retention.
3. **Process overdue notification retries**: Simulates missed retry windows and schedules next attempts.

Order matters: stock is freed before other cleanup runs.

### 18.3 File Preview

`preview.service.ts` maps MIME types to `FilePreviewType`:
- **Image**: `image/*` → `<img>` tag
- **PDF**: `application/pdf` → `<iframe>`
- **Text**: `text/*`, `application/json`, `application/xml` → `<pre>` with TextDecoder
- **Audio**: `audio/*` → `<audio controls>`
- **Video**: `video/*` → `<video controls>`
- **Unsupported**: Everything else → explicit "not available" message

Preview uses Blob URLs created via `createPreviewUrl()` and revoked on component destroy to prevent memory leaks.

### 18.4 Face Enrollment Flow

Multi-step enrollment in `src/routes/identity/EnrollmentFlow.svelte`:

1. **Name entry**: User provides profile name.
2. **Camera init**: `initCamera()` requests `getUserMedia` with min 1280x720.
3. **Quality checks**: `runAllQualityChecks()` validates resolution, brightness (luminance formula: `R*0.299 + G*0.587 + B*0.114`, range 40-220), and occlusion (edge-density heuristic, threshold 0.7).
4. **Liveness**: `LivenessFlow` prompts "blink and turn", captures 5 frames over 3 seconds, analyzes eye-region variance (blink) and horizontal centroid shift (turn).
5. **Vector generation**: `generateVector()` produces a 128-element Float32Array via grid-based luminance feature extraction. **Disclosure**: This is an on-device application feature, not certified biometric verification.
6. **Encrypted storage**: `encryptAndStore()` encrypts the vector with AES-GCM using the user's DEK, stores in IndexedDB `vectors` store.

### 18.5 Admin Settings

- **Template Management**: View/edit notification templates per event type and channel.
- **Bandwidth Settings**: Set file transfer cap (stored in LocalStorage).
- **Zone Priority**: Configure pick-path zone ordering (stored in LocalStorage).
- **User Management**: Create users with roles (Admin only, from Prompt 6).
- **Safety Stock Thresholds**: Per SKU/warehouse threshold configuration (Admin only, from Prompt 6).

---

## 19. Testing Strategy and Docker Configuration (Added in Prompts 8-9)

### 19.1 Test Suite Organization

48 test files in `repo/frontend/unit_tests/` targeting >90% coverage of critical logic:

| Directory | Files | Coverage Area |
|-----------|-------|---------------|
| `validators/` | 7 | Pure-function input validation for all domains |
| `security/` | 5 | Crypto, auth lifecycle, idle monitor, permissions, masking |
| `services/` | 17 | All business engines, import/export, templates, liveness, broadcast, reconciliation, sensitive data |
| `stores/` | 2 | Auth store, app store reactive state |
| `components/` | 3 | Shell routing, nav visibility, preference persistence |
| `screens/` | 4 | Inventory/order/file/settings workflow integration |
| `db/` | 2 | Schema integrity, repository CRUD |
| `logging/` | 1 | Logger output, sanitization |
| Root | 7 | Types, constants, pick-path, retention, reservation timer, routes, scaffold |

### 19.2 Coverage Configuration

Vitest v8 coverage provider configured in `vite.config.ts`:
- **Include**: `src/**/*.ts`, `src/**/*.svelte`
- **Exclude**: `src/**/*.d.ts`, `src/**/index.ts` (barrel files)
- **Reports**: `./coverage/` directory

### 19.3 Docker Configuration

**Single-service frontend container:**
- `Dockerfile`: Multi-stage Node 20 Alpine build → Vite preview
- `docker-compose.yml`: One `frontend` service, port `4173:4173`
- `.dockerignore`: Excludes `node_modules`, `dist`, `coverage`, `.git`, tests
- No backend, no reverse proxy, no additional services

**Port consistency verified across:**
- `vite.config.ts`: `server.port: 5173` (dev), `preview.port: 4173` (preview)
- `Dockerfile`: `EXPOSE 4173`, `CMD preview --host 0.0.0.0`
- `docker-compose.yml`: `4173:4173`
- `README.md`: Documents both ports

### 19.4 Requirement Traceability

Full requirement-to-test mapping maintained in `docs/test-traceability.md` covering all 37+ requirements across inventory, orders, files, identity, security, notifications, preferences, import/export, UI, and service infrastructure.
