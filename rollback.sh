#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${GCP_REGION:?GCP_REGION is required}"
: "${GCP_SERVICE_NAME:?GCP_SERVICE_NAME is required}"
: "${REVISION:?REVISION is required (target Cloud Run revision name)}"

echo "Rolling back ${GCP_SERVICE_NAME} to revision ${REVISION}"
gcloud run services update-traffic "${GCP_SERVICE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --region "${GCP_REGION}" \
  --to-revisions "${REVISION}=100"

echo "Rollback complete"
