# Requirement-to-Test Traceability Matrix

This document maps each requirement from the Original Prompt to its test files and key test cases.

## Inventory (R-INV)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-INV-01 | Multi-warehouse bins | `services/inventory.test.ts` | receiveStock creates record by bin; transferStock updates both bins |
| R-INV-02 | Inbound/outbound/count/transfer | `services/inventory.test.ts` | receiveStock, shipStock, transferStock, cycleCount all tested |
| R-INV-03 | Safety stock 20/SKU/warehouse | `services/inventory.test.ts`, `validators/inventory.test.ts`, `constants.test.ts` | Alert generated when below threshold; SAFETY_STOCK_DEFAULT=20; validateSafetyStockConfig |
| R-INV-04 | Immutable ledger | `services/inventory.test.ts`, `db/repository.test.ts` | Ledger entries cannot be deleted/cleared; append-only enforcement |

## Orders (R-ORD)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-ORD-01 | Reserve stock at creation | `services/orders.test.ts`, `screens/orders.test.ts` | createOrder reserves stock per line; reservation creates hold ledger entry |
| R-ORD-02 | Auto-release 30min / cancel | `services/orders.test.ts`, `reservation-timer.test.ts`, `validators/orders.test.ts` | releaseExpired at 30-min boundary; cancelOrder releases all; isReservationExpired timing |
| R-ORD-03 | Wave planning 25 lines | `services/waves.test.ts`, `screens/orders.test.ts`, `constants.test.ts` | planWave rejects >25 lines; WAVE_DEFAULT_SIZE=25 |
| R-ORD-04 | Pick-path zone+bin sort | `pick-path.test.ts`, `services/waves.test.ts` | Zone priority then bin alpha; unknown zones sort last; sequence 1..N |
| R-ORD-05 | Discrepancy verification | `services/waves.test.ts`, `screens/orders.test.ts` | State machine transitions; invalid transitions throw; canProceedToPacking blocked until verified |

## Files (R-FILE)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-FILE-01 | 10MB chunks, 3 concurrent | `services/file-transfer.test.ts`, `constants.test.ts` | FILE_CHUNK_SIZE=10MB; MAX_CONCURRENT_CHUNKS=3; chunk scheduler limits |
| R-FILE-02 | SHA-256 dedup | `services/file-transfer.test.ts` | computeHash produces hex; dedup skips upload for identical files |
| R-FILE-03 | Version rollback, last 10 | `services/file-transfer.test.ts`, `retention.test.ts`, `screens/files.test.ts` | enforceVersionLimit keeps 10; rollback creates new version with old content |
| R-FILE-04 | Recycle bin 30 days | `retention.test.ts`, `services/file-transfer.test.ts`, `screens/files.test.ts` | isRecycleBinExpired at 30-day boundary; purgeExpired removes old entries; soft delete/restore |
| R-FILE-05 | Local preview | `services/preview.test.ts` | getPreviewType maps image/pdf/text/audio/video; canPreview returns false for unsupported |
| R-FILE-06 | Bandwidth cap | `services/file-transfer.test.ts`, `validators/files.test.ts` | setBandwidthCap rejects <=0; validateBandwidthCap |

## Identity (R-ID)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-ID-01 | Webcam face enrollment | `services/identity-enrollment.test.ts`, `services/identity-service.test.ts` | enrollProfile creates record; startEnrollment creates session |
| R-ID-02 | Quality: 720p, brightness, occlusion | `services/identity-enrollment.test.ts`, `validators/identity.test.ts` | checkResolution rejects <720p; checkBrightness range 40-220; checkOcclusion threshold 0.7 |
| R-ID-03 | Liveness: blink-and-turn | `services/liveness.test.ts` | LivenessFlow state machine; LIVENESS_FRAME_COUNT=5; result enum values |
| R-ID-04 | Feature vector, encrypted storage | `services/identity-enrollment.test.ts` | generateVector produces 128-element Float32Array; deterministic output |
| R-ID-05 | Bulk import/export JSON/CSV | `services/import-export.test.ts`, `screens/files.test.ts` | JSON import valid/invalid; CSV import; export format; selective export |

## Security (R-SEC)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-SEC-01 | PBKDF2 pseudo-login | `security/crypto.test.ts`, `security/auth.test.ts` | hashPassword/verifyPassword round-trip; login success/failure |
| R-SEC-02 | 10-minute idle lock | `security/idle-monitor.test.ts`, `constants.test.ts` | Lock fires after 600000ms; activity resets timer |
| R-SEC-03 | AES-GCM encryption | `security/crypto.test.ts` | encrypt/decrypt round-trip; wrong key throws; key wrap/unwrap |
| R-SEC-04 | PII masking + reveal | `security/masking.test.ts` | shouldMask by role; canRevealField by capability; maskValue types |
| R-SEC-05 | Role-based access | `security/permissions.test.ts`, `components/nav.test.ts`, `components/shell.test.ts` | canAccess per route; canMutate per action; Auditor read-only; nav visibility |

## Notifications (R-NOT)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-NOT-01 | In-app inbox items | `services/notifications.test.ts` | createInboxItem writes to IDB; getInbox retrieves |
| R-NOT-02 | External channel audit | `services/notifications.test.ts`, `services/templates.test.ts` | queueExternalAttempt creates pending; templates cover 5 event types |
| R-NOT-03 | Retry at 1, 5, 15 min | `services/notifications.test.ts`, `validators/notifications.test.ts`, `services/reconciliation.test.ts` | processRetries schedules next; 3 retries then skipped; reconcile on startup |
| R-NOT-04 | Subscription prefs | `services/notifications.test.ts` | getSubscriptions; updateSubscription; isSubscribed default true |
| R-NOT-05 | Read receipts | `services/notifications.test.ts` | markAsRead records receipt; unread count updates |

## Preferences (R-PREF)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-PREF-01 | Column layouts, filters | `components/preferences.test.ts` | ColumnLayoutManager save/get/reset; FilterStateManager save/get/clear |
| R-PREF-02 | Search history cap 50 | `services/preferences.test.ts`, `validators/preferences.test.ts` | SearchHistory 50-cap; dedup; FIFO order; validateSearchHistory |

## Import/Export (R-EXP)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-EXP-01 | File pickers, Blob downloads | `services/import-export.test.ts` | Profile export produces valid JSON/CSV |
| R-EXP-02 | Ledger CSV export | `screens/files.test.ts` | Export button present in ledger screen |

## UI (R-UI)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-UI-01 | Left navigation rail | `components/nav.test.ts` | Admin sees all; Auditor no /identity; PickerPacker no /files |
| R-UI-02 | Tables, filter chips, search | `components/shell.test.ts` | Route map has all paths; routeConfig has labels |
| R-UI-03 | Drawers and modals | `components/shell.test.ts` | Route guard blocks unauthenticated; blocks unauthorized |

## Service Infrastructure (R-SVC)

| Req ID | Description | Test File(s) | Key Test Cases |
|--------|-------------|-------------|----------------|
| R-SVC-01 | Optimistic updates + rollback | `services/optimistic.test.ts` | Success keeps value; failure rolls back; rollback function works |

## Cross-Cutting

| Area | Test File(s) | Key Test Cases |
|------|-------------|----------------|
| Sensitive data handling | `services/sensitive-data.test.ts` | All REDACTED_FIELDS sanitized; nested objects; arrays; case-insensitive; no mutation |
| BroadcastChannel sync | `services/broadcast.test.ts` | Graceful degradation without BroadcastChannel; notify/close don't throw |
| Startup reconciliation | `services/reconciliation.test.ts` | Releases expired reservations; purges recycle bin; processes retries; empty state |
| Constants correctness | `constants.test.ts` | Every prompt magic number verified |
| Type/enum integrity | `types.test.ts` | All enum member counts and values verified |
| DB schema integrity | `db/schema.test.ts` | 24 stores, indexes, keyPaths verified |

## Summary

| Category | Test Files | Estimated Test Cases |
|----------|-----------|---------------------|
| Validators | 7 | ~50 |
| Security | 5 | ~40 |
| Services | 17 | ~120 |
| Stores | 2 | ~15 |
| Components/Screens | 7 | ~45 |
| Infrastructure | 5 | ~30 |
| **Total** | **48** | **~300** |
