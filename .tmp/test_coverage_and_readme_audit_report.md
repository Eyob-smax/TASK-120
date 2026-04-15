# Test Coverage Audit

Static inspection only. No code, tests, scripts, containers, or package-manager commands were executed for this audit.

## Project Context Used for This Audit

- Inferred project type: `web` SPA.
- Evidence:
  - `repo/README.md:3` describes an "Offline browser SPA" and says "No backend required."
  - `repo/frontend/package.json:7-18` contains Vite/Svelte SPA scripts and no backend/server dependency.
  - `repo/frontend/src/routes/routes.ts:23-52` defines client-side SPA routes, not HTTP API handlers.

## Backend Endpoint Inventory

No backend HTTP endpoints were discovered.

Evidence:

- `repo/README.md:3,87` states the app is an offline browser SPA with "no backend API."
- `repo/frontend/package.json:7-18` contains frontend-only runtime dependencies (`svelte-spa-router`, `idb`) and Vite scripts.
- `repo/frontend/src/routes/routes.ts:23-52` defines client-side paths such as `/dashboard`, `/inventory`, `/files`, `/identity`, and `/settings`.
- Targeted search for server/API signatures across `repo/frontend/src`, `repo/frontend/unit_tests`, `repo/frontend/integration_tests`, and `repo/frontend/e2e_tests` returned no matches for `express`, `fastify`, `app.get`, `app.post`, `supertest`, `request(app)`, or `fetch(...)`.

## API Test Mapping Table

| Endpoint | Covered | Test Type | Test Files | Evidence |
|---|---|---|---|---|
| None discovered | N/A | N/A | N/A | See endpoint inventory evidence above. No server routes were present to map. |

## API Test Classification

- True No-Mock HTTP: none.
- HTTP with Mocking: none.
- Non-HTTP (unit/integration without HTTP): the visible suite.

Representative evidence:

- Browser UI E2E, not API: `repo/frontend/e2e_tests/role-navigation.spec.ts`, test `first-run setup creates admin, navigates to dashboard, and shows nav items` uses `page.goto('/')`, form fills, and URL assertions (`role-navigation.spec.ts:14-44`).
- Service-layer integration, not HTTP: `repo/frontend/integration_tests/critical-path-smoke.test.ts`, test `full flow with notification evidence at every business event` directly imports and executes services such as `createOrder`, `planWave`, `reportDiscrepancy`, and `processRetries` (`critical-path-smoke.test.ts:14-32,60-145`).
- Service-layer integration, not HTTP: `repo/frontend/unit_tests/integration/wiring.test.ts`, test `full flow: ingest file, schedule chunks, complete, create version` directly imports `ingestFile`, `ChunkScheduler`, and `createVersion`.
- Repository/unit coverage, not HTTP: `repo/frontend/unit_tests/db/repositories.test.ts`, suite `Repositories — indexed queries` directly exercises IndexedDB repositories (`repositories.test.ts:45-120` and remainder of file).

## Mock Detection

All files listed below are non-HTTP tests by definition when the mocked dependency is part of the execution path.

### `auth.service` mocked

What is mocked: `../../src/lib/security/auth.service` or `../src/lib/security/auth.service`, typically to force a synthetic logged-in session and/or a `null` DEK.

Where:

- `repo/frontend/unit_tests/app/init.test.ts:4`
- `repo/frontend/unit_tests/components/login.test.ts:7`
- `repo/frontend/unit_tests/components/app-render.test.ts:9`
- `repo/frontend/unit_tests/integration/wiring.test.ts:33`
- `repo/frontend/integration_tests/critical-path-smoke.test.ts:42`
- `repo/frontend/unit_tests/screens/inventory.test.ts:16`
- `repo/frontend/unit_tests/screens/orders.test.ts:21`
- `repo/frontend/unit_tests/stores/file.store.test.ts:18`
- `repo/frontend/unit_tests/stores/identity.store.test.ts:13`
- `repo/frontend/unit_tests/stores/inventory.store.test.ts:21`
- `repo/frontend/unit_tests/stores/order.store.test.ts:21`
- `repo/frontend/unit_tests/stores/notification.store.test.ts:14`
- `repo/frontend/unit_tests/services/chunk-scheduler.test.ts:13`
- `repo/frontend/unit_tests/services/discrepancy-attachments.test.ts:15`
- `repo/frontend/unit_tests/services/error-paths.test.ts:23`
- `repo/frontend/unit_tests/services/file-service-edge.test.ts:19`
- `repo/frontend/unit_tests/services/inventory-extra.test.ts:12`
- `repo/frontend/unit_tests/services/orders.test.ts:16`
- `repo/frontend/unit_tests/services/inventory.test.ts:16`
- `repo/frontend/unit_tests/services/reconciliation.test.ts:9`
- `repo/frontend/unit_tests/services/recycle-bin-errors.test.ts:9`
- `repo/frontend/unit_tests/services/subscription.test.ts:12`
- `repo/frontend/unit_tests/services/vector.test.ts:14`
- `repo/frontend/unit_tests/services/unauth.test.ts:5`
- `repo/frontend/unit_tests/services/waves.test.ts:16`

Impact: these tests do not exercise the real auth/session boundary while executing downstream services, stores, screens, or integrations.

### Other full-module mocks

What is mocked: `../../src/lib/services/reconciliation`

Where:

- `repo/frontend/unit_tests/app/init.test.ts:10`

What is mocked: `../../src/lib/services/broadcast`

Where:

- `repo/frontend/unit_tests/app/init.test.ts:18`

What is mocked: `../src/app/init`

Where:

- `repo/frontend/unit_tests/main.test.ts:4`

What is mocked: `../src/styles/global.css` as a virtual module

Where:

- `repo/frontend/unit_tests/main.test.ts:9`

What is mocked: `../../src/modules/orders/order.service`

Where:

- `repo/frontend/unit_tests/services/reconciliation-errors.test.ts:4`

What is mocked: `../../src/modules/files/recycle-bin.service`

Where:

- `repo/frontend/unit_tests/services/reconciliation-errors.test.ts:7`

What is mocked: `../../src/modules/notifications/notification.service`

Where:

- `repo/frontend/unit_tests/services/reconciliation-errors.test.ts:10`

### Spies / stubs on internal functions or environment objects

What is stubbed: `authService.getCurrentDEK` and `authService.getCurrentSession`

Where:

- `repo/frontend/unit_tests/services/identity-encryption.test.ts:23-24,62`

What is stubbed: `ChunkScheduler.processChunk`

Where:

- `repo/frontend/unit_tests/services/file-transfer.test.ts:142,181,316`

What is stubbed: `document.createElement`

Where:

- `repo/frontend/unit_tests/services/capture.test.ts:55`
- `repo/frontend/unit_tests/services/liveness-flow.test.ts:23`
- `repo/frontend/unit_tests/components/interactive.test.ts:186`

What is stubbed: console methods

Where:

- `repo/frontend/unit_tests/services/reconciliation-errors.test.ts:18-19`
- `repo/frontend/unit_tests/logging/logger.test.ts:68,76,84`
- `repo/frontend/unit_tests/logging/logger-debug.test.ts:10,18`

Static count from targeted search:

- `vi.mock(...)` declarations found: 32
- Additional spy/stub hits (`spyOn`, `mockImplementation`, `mockReturnValue`, `mockResolvedValue`, `mockRejectedValue`): 21

## Coverage Summary

- Total endpoints: 0
- Endpoints with HTTP tests: 0
- Endpoints with true no-mock HTTP tests: 0
- HTTP coverage: N/A (`0/0`)
- True API coverage: N/A (`0/0`)
- Test file inventory found statically: 84 unit files, 2 integration files, 1 E2E file, 87 total

## Unit Test Summary

### Modules Covered

- Controllers: none in the codebase were discovered.
- Services:
  - Auth/security: `repo/frontend/unit_tests/security/auth.test.ts`, suite `Auth Service`; `repo/frontend/unit_tests/security/auth-unlock-errors.test.ts`; `repo/frontend/unit_tests/security/crypto.test.ts`; `repo/frontend/unit_tests/security/permissions.test.ts`
  - Orders/inventory: `repo/frontend/unit_tests/services/inventory.test.ts`, `orders.test.ts`, `waves.test.ts`, `error-paths.test.ts`
  - Files: `repo/frontend/unit_tests/services/file-transfer.test.ts`, `chunk-scheduler.test.ts`, `file-service-edge.test.ts`, `recycle-bin-errors.test.ts`; `repo/frontend/unit_tests/screens/files.test.ts`
  - Notifications: `repo/frontend/unit_tests/services/notifications.test.ts`, suite `Notification Service`; `repo/frontend/unit_tests/services/subscription.test.ts`
  - Identity: `repo/frontend/unit_tests/services/identity-service.test.ts`, `identity-enrollment.test.ts`, `identity-encryption.test.ts`, `vector.test.ts`, `capture.test.ts`, `liveness.test.ts`, `quality.test.ts`
  - Preferences/support services: `repo/frontend/unit_tests/services/preferences.test.ts`, suite `PreferenceStorage`; `repo/frontend/unit_tests/services/optimistic.test.ts`; `repo/frontend/unit_tests/services/broadcast.test.ts`
- Repositories:
  - `repo/frontend/unit_tests/db/repositories.test.ts`, suite `Repositories — indexed queries`, exercises warehouse, bin, SKU, stock, movement ledger, safety stock, orders, reservations, waves, tasks, discrepancies, files, chunks, transfer sessions, versions, recycle bin, identity, notification, subscription, and receipts.
  - `repo/frontend/unit_tests/db/repository-advanced.test.ts`, suites `Repository advanced helpers` and `withTransaction helper`, cover generic repository helpers and transaction semantics.
- Auth / guards / middleware equivalents:
  - `repo/frontend/unit_tests/components/shell.test.ts`, suite `Route Guard`, tests `checkRouteAccess` against authenticated and role-gated cases (`shell.test.ts:39-106`)
  - `repo/frontend/unit_tests/security/permissions.test.ts`, suite `Permissions`, tests `canAccess`, `canMutate`, `canReveal`, and `isReadOnly`
  - `repo/frontend/e2e_tests/role-navigation.spec.ts`, test `unauthenticated access to dashboard redirects to login` validates route-guard behavior in a browser (`role-navigation.spec.ts:77-83`)
- Validation:
  - `repo/frontend/unit_tests/validators/auth.test.ts`, suites `validateUsername`, `validatePassword`, `validateUserCreation`
  - `repo/frontend/unit_tests/validators/files.test.ts`, suites `validateFileIngest`, `validateChunkSize`, `validateBandwidthCap`, `validateVersionRetention`, `isRecycleBinExpired`

### Important Modules Not Directly Tested

- `repo/frontend/src/app/route-guard.ts:20-27`, function `handleRouteFailure`
  - Targeted search found no direct test reference to `handleRouteFailure`.
- `repo/frontend/src/routes/settings/UserManagement.svelte`
- `repo/frontend/src/routes/settings/SafetyStockSettings.svelte`
- `repo/frontend/src/routes/settings/TemplateManagement.svelte`
- `repo/frontend/src/routes/settings/BandwidthSettings.svelte`
- `repo/frontend/src/routes/settings/ZonePrioritySettings.svelte`
  - These are all mounted from `repo/frontend/src/routes/Settings.svelte:6-10,19-40`.
  - Targeted search across `unit_tests`, `integration_tests`, and `e2e_tests` found no direct test references for those component names.

## API Observability Check

- API observability: not applicable. No API tests exist because no HTTP endpoints were discovered.
- Browser/UI observability: adequate in the single Playwright suite. `repo/frontend/e2e_tests/role-navigation.spec.ts` shows explicit user inputs (`page.fill(...)`), route transitions (`toHaveURL(...)`), and visible UI outcomes (`toBeVisible()`, `toHaveText()`).
- Service-level observability: generally good. `repo/frontend/integration_tests/critical-path-smoke.test.ts` and `repo/frontend/unit_tests/services/notifications.test.ts` assert concrete state changes, queued attempts, statuses, and repository-visible outcomes.

Weak observability or superficial checks:

- `repo/frontend/unit_tests/routes.test.ts`, suite `Route Registry Contract`, creates a local `plannedRoutes` object instead of importing the production router from `src/routes/routes.ts`. That makes the test weak as a regression detector (`routes.test.ts:4-15,17-41`).
- `repo/frontend/e2e_tests/role-navigation.spec.ts`, test `login error uses role="alert" for screen readers`, does not prove the alert rendered. It ends by asserting only that the username field still has the `required` attribute (`role-navigation.spec.ts:136-149`).

## Tests Check

- Success paths: present and meaningful.
  - `repo/frontend/unit_tests/security/auth.test.ts`, tests `createInitialAdmin creates an administrator`, `login succeeds with correct credentials`, and `unlock restores session and DEK`
  - `repo/frontend/integration_tests/critical-path-smoke.test.ts`, test `full flow with notification evidence at every business event`
  - `repo/frontend/unit_tests/services/notifications.test.ts`, tests `createInboxItem writes to IndexedDB` and `processRetries simulates overdue attempts and schedules next`
- Failure cases: present.
  - `repo/frontend/unit_tests/security/auth.test.ts`, tests `login fails with wrong password` and `createUser throws when not Administrator`
  - `repo/frontend/unit_tests/services/error-paths.test.ts`, multiple `throws when ... is missing` tests
  - `repo/frontend/unit_tests/services/reconciliation-errors.test.ts`, test `returns zeros when every dependency throws`
- Edge cases: present.
  - `repo/frontend/unit_tests/services/file-transfer.test.ts`, tests scheduler concurrency, pause/resume, version-tagged chunk behavior, rollback, and recycle-bin retention
  - `repo/frontend/unit_tests/validators/files.test.ts`, tests exact chunk-size boundaries and retention boundary timestamps
  - `repo/frontend/unit_tests/services/preferences.test.ts`, test `enforces 50-entry cap`
- Validation: present.
  - `repo/frontend/unit_tests/validators/auth.test.ts`
  - `repo/frontend/unit_tests/validators/files.test.ts`
- Auth / permissions: present.
  - `repo/frontend/unit_tests/security/auth.test.ts`
  - `repo/frontend/unit_tests/security/permissions.test.ts`
  - `repo/frontend/e2e_tests/role-navigation.spec.ts`, tests login and unauthenticated redirect
- Integration boundaries: partial.
  - Real browser/UI boundary exists in `repo/frontend/e2e_tests/role-navigation.spec.ts`
  - Storage boundary exists through fake IndexedDB in unit/integration tests
  - No network/server boundary exists because the app is frontend-only
  - Many higher-level flows bypass real auth by mocking `auth.service`, so cross-module integration is not uniformly end-to-end
- Real assertions vs superficial assertions: mostly real, but not uniformly.
  - Strong examples: `critical-path-smoke.test.ts:90-145`; `notifications.test.ts:48-90`; `repositories.test.ts` indexed-query assertions
  - Weak examples: `routes.test.ts:4-41`; `role-navigation.spec.ts:136-149`

## `run_tests.sh` Check

- Docker-based: yes, acceptable under the audit rule.
- Evidence:
  - `repo/run_tests.sh:10-13` runs `docker compose --profile test run --rm --build test ...`
  - `repo/docker-compose.yml:11-23` defines `test` and `e2e` services
- Local dependency flag:
  - The script itself is Docker-based and passes this check.
  - The README does not pass the environment rule, because it also instructs local Node/npm usage and Playwright browser installation. That is a documentation failure, not a `run_tests.sh` failure.

## End-to-End Expectations

- Because the project is a `web` SPA, not a backend/fullstack service, full FE↔BE end-to-end coverage is not applicable.
- Browser-level E2E exists, but it is narrow:
  - `repo/frontend/e2e_tests/role-navigation.spec.ts` covers first-run admin setup, login, navigation, sign-out, unauthenticated redirect, and several accessibility checks.
- Service-layer integrations partially compensate:
  - `repo/frontend/integration_tests/critical-path-smoke.test.ts`
  - `repo/frontend/unit_tests/integration/wiring.test.ts`
- Compensation is incomplete because those integrations still bypass real auth via mocks and do not exercise the same path as a user/browser from start to finish.

## Test Coverage Score (0–100)

67

## Score Rationale

- Strong breadth on repositories, service modules, validators, permissions, and local persistence.
- At least one real browser E2E exists and is not a shallow smoke-only page load.
- Two higher-level service integration files cover business workflows across multiple modules.
- Score is capped down because there is no HTTP/API layer to audit, no API request coverage, and many cross-module tests mock auth rather than running the full execution path.
- Score is also reduced for weak tests that do not bind to production code (`unit_tests/routes.test.ts`) or do not assert the headline claim strongly (`role-navigation.spec.ts` alert test).
- Several important Settings subcomponents and `handleRouteFailure` have no direct test references.

## Test Coverage Verdict

PARTIAL PASS

## Key Gaps

- No backend HTTP API exists, so the API coverage portion of the audit is effectively not applicable.
- Auth is frequently mocked in higher-level tests, so many workflows are not full-path tests.
- `handleRouteFailure` has no direct test reference.
- Settings subcomponents mounted by `Settings.svelte` have no direct test references.
- `unit_tests/routes.test.ts` is disconnected from the production route registry.
- The single Playwright suite is useful but narrow.

## Confidence & Assumptions

- Confidence is high that this repo is a frontend-only web SPA with no backend API.
- Confidence is medium-high on the "not directly tested" list because it is based on targeted reference search, not runtime coverage tooling.
- No conclusions depend on executing the suite or observing runtime behavior.

# README Audit

Static inspection only. README path inspected: `repo/README.md`.

## Project Type Detection

- README top does not explicitly declare one of the required labels (`backend`, `fullstack`, `web`, `android`, `ios`, `desktop`).
- Inferred type: `web`
- Evidence:
  - `repo/README.md:3` says "Offline browser SPA" and "No backend required"
  - `repo/frontend/package.json:7-18` is frontend-only
  - `repo/frontend/src/routes/routes.ts:23-52` defines browser routes

## Hard Gate Failures

- Environment rules: FAIL
  - `repo/README.md:5-16` requires local `Node.js`, `npm`, and `npm install`
  - `repo/README.md:31-48` instructs local `npm run test`, `npm run check`, and Playwright with browsers installed
  - `repo/README.md:58` explicitly recommends local testing without Docker
  - Strict rule required Docker-contained instructions only
- Verification method: FAIL
  - `repo/README.md:18-29` and `60-67` provide run commands and URLs but do not describe a concrete UI flow to verify the system works
  - There is no equivalent of "open X, create Y, observe Z"
- Demo credentials / auth guidance: FAIL
  - Auth clearly exists in code: `repo/frontend/src/routes/Login.svelte:4,16-19,25-47,66-86`
  - Multiple roles exist: `repo/frontend/src/lib/types/enums.ts:1-5`
  - `repo/README.md` provides no username/password list, no role matrix, and does not state "No authentication required"

## High Priority Issues

- The README violates the strict Docker-contained environment rule by leading with local Node/npm prerequisites and `npm install` (`repo/README.md:5-16`).
- The README mixes Docker and non-Docker test workflows, including local `npm run test` and locally installed Playwright browsers (`repo/README.md:31-58`).
- The README omits required authentication guidance despite the app having first-run admin setup and role-based behavior (`repo/frontend/src/routes/Login.svelte:16-47`; `repo/frontend/src/lib/types/enums.ts:1-5`).
- The README lacks a concrete verification flow after startup. A URL alone is not a verification method (`repo/README.md:21-29,64-67`).

## Medium Priority Issues

- The project type is not explicitly labeled as `web` at the top of the README; it has to be inferred from the prose (`repo/README.md:1-3`).
- Role/security documentation is incomplete. The code defines four roles (`administrator`, `warehouse_manager`, `picker_packer`, `auditor`) in `repo/frontend/src/lib/types/enums.ts:1-5`, but the README does not explain them.
- The README does not explain the first-run bootstrap flow even though the login route supports `createInitialAdmin(...)` when no users exist (`repo/frontend/src/routes/Login.svelte:16-47`).

## Low Priority Issues

- Markdown is readable overall, but visible encoding artifacts (`â€”`) appear throughout `repo/README.md` and reduce polish.
- The scripts table largely repeats earlier command sections instead of tightening startup and verification guidance (`repo/README.md:69-79`).

## Hard Gate Passes

- README exists at the required path: `repo/README.md`
- Access method for a web app is provided:
  - Dev URL/port: `repo/README.md:21-28`
  - Docker URL/port: `repo/README.md:62-67`
- Container startup instruction exists:
  - `repo/README.md:62-65` includes `docker compose up --build`

## README Verdict

FAIL

## Final Verdicts

- Test Coverage Audit: PARTIAL PASS
- README Audit: FAIL
