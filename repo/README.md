# ForgeOps Offline Warehouse & Identity Console

Offline browser SPA for warehouse inventory, orders, file management, and identity — built with Svelte 4 + TypeScript, Vite 5, IndexedDB, and WebCrypto. No backend required.

Or from the repo root (requires Docker and Docker Compose):

```bash
bash run_tests.sh            # run tests inside Docker container
bash run_tests.sh --coverage # run with coverage inside Docker container
```

> **Note:** `run_tests.sh` uses `docker compose` under the hood. For local testing without Docker, use `npm run test` from the `repo/frontend` directory.

## Docker

```bash
# From repo/ directory
docker compose up --build

# App available at http://localhost:4173
```

## Configuration

- **Ports**: 5173 (dev), 4173 (preview/Docker)
- **Persistence**: IndexedDB for data, LocalStorage for UI preferences
- **Security**: PBKDF2 password hashing, AES-GCM encryption via WebCrypto
- **No env variables required** — all defaults are built in
- **Fully offline** — no network calls, no backend API

## Documentation

- [`docs/design.md`](../docs/design.md) — Architecture and design
- [`docs/api-spec.md`](../docs/api-spec.md) — Local service contracts
- [`docs/test-traceability.md`](../docs/test-traceability.md) — Requirement-to-test mapping
