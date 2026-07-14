#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${GCP_REGION:?GCP_REGION is required}"
: "${GCP_SERVICE_NAME:?GCP_SERVICE_NAME is required}"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/elevate-analytics/${GCP_SERVICE_NAME}:${IMAGE_TAG}"

echo "Building image ${IMAGE_URI}"
docker build -t "${IMAGE_URI}" .

echo "Pushing image"
docker push "${IMAGE_URI}"

echo "Deploying to Cloud Run"
gcloud run deploy "${GCP_SERVICE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --region "${GCP_REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --image "${IMAGE_URI}" \
  --set-env-vars NODE_ENV=production \
  --set-secrets JWT_SECRET=jwt-secret:latest,SESSION_SECRET=session-secret:latest,ENCRYPTION_KEY=encryption-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest

echo "Deploy complete: ${IMAGE_URI}"
