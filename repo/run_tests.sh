#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}"

echo "=== ForgeOps Offline Console — Test Suite (Docker) ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Unit + Integration tests (always run)
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--coverage" ]]; then
  echo "--- Unit & Integration Tests (with coverage) ---"
  docker compose --profile test run --rm --build test npm run test:coverage
else
  echo "--- Unit & Integration Tests ---"
  docker compose --profile test run --rm --build test
fi

# ---------------------------------------------------------------------------
# 2. E2E tests — run unless caller passes --skip-e2e
# ---------------------------------------------------------------------------
if [[ "${1:-}" != "--skip-e2e" ]]; then
  echo ""
  echo "--- E2E Tests (Playwright) ---"
  # Start the frontend preview server in the background
  # Lower PBKDF2 cost only for this E2E frontend build to avoid auth/setup timeouts.
  E2E_PBKDF2_ITERATIONS="${E2E_PBKDF2_ITERATIONS:-120000}"
  VITE_PBKDF2_ITERATIONS="${E2E_PBKDF2_ITERATIONS}" docker compose up -d --build frontend

  # Wait for the preview server to become reachable
  echo "Waiting for frontend on port 4173..."
  RETRIES=30
  until curl -sf http://localhost:4173 > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [[ $RETRIES -le 0 ]]; then
      echo "ERROR: Frontend did not start within 30 seconds"
      docker compose down
      exit 1
    fi
    sleep 1
  done
  echo "Frontend ready."

  # Run Playwright E2E tests
  # Do not force rebuild here; it can fail on transient registry DNS issues.
  docker compose --profile e2e run --rm e2e

  # Tear down the frontend container
  docker compose down
fi

echo ""
echo "=== Tests complete ==="
