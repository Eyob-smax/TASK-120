#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}"

echo "=== ForgeOps Offline Console — Test Suite (Docker) ==="
echo ""

if [[ "${1:-}" == "--coverage" ]]; then
  docker compose --profile test run --rm --build test npm run test:coverage
else
  docker compose --profile test run --rm --build test
fi

echo ""
echo "=== Tests complete ==="
