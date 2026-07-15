#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "Checking live endpoint"
curl -fsS "${BASE_URL}/live" >/dev/null

echo "Checking ready endpoint"
curl -fsS "${BASE_URL}/ready" >/dev/null

echo "Checking health endpoint"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "Checking version endpoint"
curl -fsS "${BASE_URL}/version" >/dev/null

echo "Checking metrics endpoint"
curl -fsS "${BASE_URL}/metrics" >/dev/null || true

echo "Production smoke checks completed"
