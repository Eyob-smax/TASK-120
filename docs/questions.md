## 1. The Gap
The prompt requires a local-only username/password pseudo-login in a browser-only app, but it does not specify how the very first administrator account is created or recovered on a fresh device.

### The Interpretation
Treat first-run bootstrap as a local device initialization flow. The first person opening a fresh app instance creates the initial Administrator account directly in-browser, and subsequent users are managed by Administrators from within the app.

### Proposed Implementation
Add a guarded first-run setup route that appears only when no users exist in IndexedDB. It creates the initial Administrator with PBKDF2-hashed password material and required profile metadata, then disables itself once setup is complete. Also add an Administrator-only local export/import path for user backup and a documented device-local reset procedure for development/test only.

---

## 2. The Gap
The prompt requires AES-GCM encryption for face vectors, identity attributes, and file encryption keys, but it does not specify the browser-side key lifecycle, especially across reloads and re-login.

### The Interpretation
Use a password-derived key strategy so encrypted sensitive records remain usable across sessions without storing raw master secrets in plaintext. The user password is the trust anchor for deriving a wrapping key.

### Proposed Implementation
Derive a per-user master key from the login password via PBKDF2 and use it to wrap/unlock a stored data-encryption key. Store only encrypted key material, salt, IVs, and metadata in IndexedDB. Re-derive on login or unlock, keep decrypted keys in memory only for the active session, and clear them on screen lock, logout, or tab close.

---

## 3. The Gap
The prompt says file management provides “instant upload via SHA-256 hash deduplication” in a fully offline browser app, but it does not define what “instant upload” means when the source file still has to be read locally.

### The Interpretation
“Instant upload” should mean instant logical completion when an identical file payload already exists in local storage, not zero-cost processing for first-time files.

### Proposed Implementation
Compute SHA-256 on the selected file stream before creating new stored content. If the hash already exists, create a new metadata/version reference without duplicating chunk payload storage and mark the operation as deduplicated-complete immediately after metadata write. For new files, proceed through normal chunked local ingestion.

---

## 4. The Gap
The prompt requires chunked and resumable transfers with a user-set bandwidth cap in a browser-only environment, but it does not specify how precise bandwidth throttling must be when browser file APIs do not provide OS-level transfer shaping.

### The Interpretation
Implement application-level throttling that limits chunk scheduling/read pacing rather than claiming transport-grade network shaping.

### Proposed Implementation
Use a transfer scheduler that meters chunk reads and writes by elapsed time and bytes processed, enforcing a configurable token-bucket or interval-budget at the service layer. Document that the cap is an app-managed throughput target for local processing, not a kernel-level bandwidth guarantee.

---

## 5. The Gap
The prompt requires notification queued attempts with retries at 1, 5, and 15 minutes for audit purposes only, but it does not specify how retry timing behaves if the app is closed during scheduled retry windows.

### The Interpretation
Retry rules should be evaluated against wall-clock timestamps when the app next becomes active. Missed retry windows are reconciled on startup/resume rather than silently dropped.

### Proposed Implementation
Persist queued attempt state with scheduled timestamps in IndexedDB. On app bootstrap and periodic foreground reconciliation, scan for overdue retry windows, append the missed audit attempts in order, and mark the queue item complete after the final scheduled attempt. Do not claim background delivery while the browser is closed.

---

## 6. The Gap
The face-enrollment requirement calls for feature-vector generation entirely on-device, but it does not specify whether a production biometric model is provided or whether approximate in-browser extraction is acceptable.

### The Interpretation
This should be implemented as a browser-local feature-extraction pipeline suitable for offline profile matching experiments inside the app, without overstating it as certified biometric identity assurance.

### Proposed Implementation
Use an in-browser model or deterministic embedding adapter packaged with the frontend build, wrapped behind a `featureVectorService` abstraction. Persist vector metadata, model version, and extraction timestamps. Document clearly in README/design docs that this is an on-device application feature for local identity records, not a regulated biometric verification claim.

---

## 7. The Gap
The prompt requires webcam quality checks for minimum 720p, calibrated brightness range, and heavy occlusion rejection, but it does not define calibration ownership or exact threshold source.

### The Interpretation
Treat calibration as an Administrator-managed local policy with sane defaults shipped in the app, while keeping the enforcement thresholds configurable.

### Proposed Implementation
Store face-capture policy settings in IndexedDB with defaults for minimum width/height, brightness range, and occlusion score threshold. Provide an Administrator settings screen to tune these values per device environment, and record the policy snapshot used for each enrollment attempt.

---

## 8. The Gap
The prompt requires click-to-reveal permission for masked PII, but it does not specify which roles may reveal all PII versus only limited identity fields.

### The Interpretation
Use explicit field-level reveal permissions instead of assuming all non-Auditor users can reveal everything.

### Proposed Implementation
Define reveal capabilities such as `identity.reveal_basic`, `identity.reveal_sensitive`, and `files.reveal_key_metadata` in a frontend permission matrix. Map them by role with the most restrictive defaults: Administrator broadest, Warehouse Manager limited operational reveal, Picker/Packer minimal reveal, Auditor masked-by-default read-only access unless explicitly granted.

---

## 9. The Gap
The prompt requires outbound discrepancy closure with photo/file attachments and notes before packing can proceed, but it does not specify whether verification is single-step or two-person approval.

### The Interpretation
Treat verification as a required explicit workflow state transition, but not necessarily a two-person separation-of-duties process unless configured later.

### Proposed Implementation
Model discrepancy states as `opened -> under_review -> verified -> resolved/packed_blocked_cleared`, with verifier identity, timestamp, notes, and attachment references required before packing actions can resume. Keep the workflow configurable so stricter approval rules can be added later without rewriting the state model.

---

## 10. The Gap
The prompt requires import/export for backup or device transfer, but it does not specify whether exports must be full-app encrypted archives or module-scoped plain files.

### The Interpretation
Support both domain-specific exports and an Administrator-level full backup format, with encryption applied when sensitive data is included.

### Proposed Implementation
Provide:
- module-scoped exports such as ledger CSV, profile JSON/CSV, and file metadata exports
- an Administrator-only full backup package containing structured JSON manifests plus encrypted sensitive payload bundles
Document the format, version it, and add import validation plus migration handling for older backup schema versions.

---

## 11. The Gap
The prompt requires rollback on validation errors during optimistic updates, but it does not define how conflicting edits across multiple open tabs/windows should be handled in a browser-only app.

### The Interpretation
Use browser-owned consistency controls and explicit frontend conflict handling rather than pretending full distributed coordination.

### Proposed Implementation
Use IndexedDB transactions for atomic writes, maintain record version metadata, and detect stale writes at the service layer. When an optimistic update conflicts, roll back local UI state, show a user-facing conflict message, and reload the latest persisted record snapshot. Add a lightweight BroadcastChannel-based invalidation signal for multi-tab freshness where supported.

---

## 12. The Gap
The prompt requires local alerts when stock falls below threshold, but it does not specify whether alerts should be edge-triggered only or repeatedly visible while the condition persists.

### The Interpretation
Use edge-triggered alert creation with persistent visibility in the inbox/history until acknowledged or the condition clears.

### Proposed Implementation
Create a low-stock inbox item when a stock record crosses from at-or-above threshold to below threshold. Keep the alert visible and update its status as inventory changes. Avoid creating duplicate alerts on every recalculation by using alert dedup keys per SKU and warehouse threshold state.
