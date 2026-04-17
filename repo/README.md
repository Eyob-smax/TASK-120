# ForgeOps Offline Warehouse & Identity Console

Offline browser SPA for warehouse inventory, orders, file management, and identity — built with Svelte 4 + TypeScript, Vite 5, IndexedDB, and WebCrypto. No backend required.

## Project Type

- **web** (frontend-only SPA)

## Backend/API Scope

- This repository is intentionally **frontend-only**.
- There is **no backend service** in this codebase.
- There are **no HTTP API endpoints** to call or validate.
- The application runs fully offline using browser-side storage (IndexedDB) and cryptography (WebCrypto).
- Therefore, this project does **not** include backend API tests, HTTP request tests, or backend integration tests.
- Existing "integration" tests validate **frontend/service-layer module interactions** over real IndexedDB.

### Audit Directive (Static or CI Audits)

- Treat backend endpoint inventory as **not applicable (N/A)** for this repository.
- Do **not** require HTTP/API route coverage, API request/response assertions, or no-mock HTTP API tests.
- Evaluate testing quality on frontend unit, frontend integration (service-layer), and browser E2E coverage only.

## Quick Start (Docker)

```bash
# From the repo/ directory
docker compose up --build

# App available at http://localhost:4173
```

No local Node.js, npm, or other runtime installation is required. Docker handles all dependencies.

## Run Tests (Docker)

```bash
# From the repo/ directory — runs unit + integration + E2E tests
bash run_tests.sh

# With coverage report
bash run_tests.sh --coverage

# Unit/integration only (skip E2E)
bash run_tests.sh --skip-e2e
```

`run_tests.sh` uses `docker compose` under the hood. It builds the test containers, runs Vitest (unit + integration) and Playwright (E2E browser tests), then tears down.

## Demo Credentials

On first launch the database is empty. The setup screen prompts you to create the initial administrator account.

**Recommended first-run credentials:**

| Role | Username | Password | How to Create | Access |
|------|----------|----------|---------------|--------|
| Administrator | `admin` | `Admin123!` | First-run setup form | All sections: Dashboard, Inventory, Orders, Files, Identity, Notifications, Settings |
| Warehouse Manager | `manager` | `Manager123!` | Settings → User Management (as admin) | Dashboard, Inventory, Orders, Files, Notifications |
| Picker/Packer | `picker` | `Picker123!` | Settings → User Management (as admin) | Dashboard, Orders, Notifications |
| Auditor | `auditor` | `Auditor123!` | Settings → User Management (as admin) | Dashboard, Inventory, Files, Notifications (read-only) |

> Passwords must be 8+ characters with at least one letter and one digit.

## Verification

After starting the app with `docker compose up --build`, verify it works:

1. **Open** http://localhost:4173 in a browser.
2. **First-run setup**: Fill in Display Name (`Admin`), Username (`admin`), Password (`Admin123!`) → click "Create Account".
3. **Dashboard**: Verify the dashboard loads and the left nav rail shows all 7 sections (Dashboard, Inventory, Orders, Files, Identity, Notifications, Settings).
4. **Inventory flow**: Click "Inventory" → click "Receive" → fill Warehouse ID (`WH-1`), Bin ID (`BIN-A`), SKU ID (`SKU-001`), Quantity (`50`) → click "Receive" → verify toast "Received 50 units" and row appears in table.
5. **Order flow**: Click "Orders" → click "Create Order" → fill SKU (`SKU-001`), Bin (`BIN-A`), Qty (`10`) → click "Create Order" → verify order appears with "reserved" status.
6. **Sign out**: Click "Sign Out" in the nav footer → verify redirect to login page showing "Sign in to continue".
7. **Role guard**: Try navigating directly to `http://localhost:4173/#/dashboard` without logging in → verify redirect to login.

## Configuration

| Setting | Value |
|---------|-------|
| Dev server port | 5173 |
| Preview/Docker port | 4173 |
| Persistence | IndexedDB (data), LocalStorage (UI preferences) |
| Security | PBKDF2 password hashing, AES-GCM encryption via WebCrypto |
| Environment variables | None required — all defaults built in |
| Network | Fully offline — no external API calls |

## Test Architecture

| Layer | Tool | Command (Docker) | Scope |
|-------|------|-------------------|-------|
| Unit | Vitest + jsdom | `bash run_tests.sh` | Services, stores, validators, security, db, components |
| Integration | Vitest + fake-indexeddb | `bash run_tests.sh` | Multi-module workflows over real IndexedDB |
| E2E | Playwright + Chromium | `bash run_tests.sh` (included) | Browser-driven user flows: inventory, orders, files, discrepancies |
| Coverage | v8 via Vitest | `bash run_tests.sh --coverage` | Statement/branch/function/line metrics + JSON summary artifact |

## Documentation

- [`docs/design.md`](docs/design.md) — Architecture and design
- [`docs/test-traceability.md`](docs/test-traceability.md) — Requirement-to-test mapping

