# ForgeOps Offline Warehouse & Identity Console

Offline browser SPA for warehouse inventory, orders, file management, and identity — built with Svelte 4 + TypeScript, Vite 5, IndexedDB, and WebCrypto. No backend required.

## Project Type

- **web** (frontend-only SPA)

## Backend/API Scope (Important)

- This repository is intentionally **frontend-only**.
- There is **no backend service** in this codebase.
- There are **no HTTP API endpoints** to call or validate.
- The application runs fully offline using browser-side storage and logic.
- Therefore, this project does **not** include backend API tests, HTTP request tests, or backend integration tests.
- Existing "integration" tests in this repository validate **frontend/service-layer module interactions** only.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker (optional, for containerized preview and `run_tests.sh`)

## Setup

```bash
cd repo/frontend
npm install
```

## Run the Application

```bash
# Development server — http://localhost:5173
npm run dev

# Production build
npm run build

# Preview production build — http://localhost:4173
npm run preview
```

## Run Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage

# TypeScript type checking
npm run check

# Browser E2E tests (requires Playwright browsers installed)
npm run test:e2e
```

Or from the repo root (requires Docker and Docker Compose):

```bash
bash run_tests.sh            # run tests inside Docker container
bash run_tests.sh --coverage # run with coverage inside Docker container
docker compose --profile e2e run --rm --build e2e  # browser E2E tests
```

> **Note:** `run_tests.sh` uses `docker compose` under the hood. For local testing without Docker, use `npm run test` from the `repo/frontend` directory.

## Docker

```bash
# From repo/ directory
docker compose up --build

# App available at http://localhost:4173
```

## Scripts

| Script                  | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Dev server (port 5173)            |
| `npm run build`         | Production build                  |
| `npm run preview`       | Preview build (port 4173)         |
| `npm run test`          | Run unit + integration tests      |
| `npm run test:coverage` | Tests + v8 coverage               |
| `npm run test:e2e`      | Browser E2E tests (Playwright)    |
| `npm run check`         | TypeScript + Svelte type checking |

## Configuration

- **Ports**: 5173 (dev), 4173 (preview/Docker)
- **Persistence**: IndexedDB for data, LocalStorage for UI preferences
- **Security**: PBKDF2 password hashing, AES-GCM encryption via WebCrypto
- **No env variables required** — all defaults are built in
- **Fully offline** — no network calls, no backend API

## Documentation

- [`docs/design.md`](../docs/design.md) — Architecture and design
- [`docs/test-traceability.md`](../docs/test-traceability.md) — Requirement-to-test mapping
