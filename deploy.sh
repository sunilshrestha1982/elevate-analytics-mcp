#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${GCP_REGION:?GCP_REGION is required}"
: "${GCP_SERVICE_NAME:?GCP_SERVICE_NAME is required}"
: "${GOOGLE_REDIRECT_URI:?GOOGLE_REDIRECT_URI is required}"
: "${ALLOWED_ORIGINS:?ALLOWED_ORIGINS is required}"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/elevate-analytics/${GCP_SERVICE_NAME}:${IMAGE_TAG}"

gcloud artifacts repositories describe elevate-analytics \
  --project "${GCP_PROJECT_ID}" \
  --location "${GCP_REGION}" >/dev/null 2>&1 || \
gcloud artifacts repositories create elevate-analytics \
  --project "${GCP_PROJECT_ID}" \
  --repository-format docker \
  --location "${GCP_REGION}" \
  --description "Artifact Registry for ${GCP_SERVICE_NAME}" \
  --quiet

echo "Building image ${IMAGE_URI}"
docker build -t "${IMAGE_URI}" .

echo "Pushing image"
docker push "${IMAGE_URI}"

echo "Deploying to Cloud Run"
gcloud run deploy "${GCP_SERVICE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --region "${GCP_REGION}" \
  --platform managed \
  --no-allow-unauthenticated \
  --port 8080 \
  --image "${IMAGE_URI}" \
  --set-env-vars "^~^NODE_ENV=production~GCP_PROJECT_ID=${GCP_PROJECT_ID}~GCP_REGION=${GCP_REGION}~GCP_SERVICE_NAME=${GCP_SERVICE_NAME}~GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}~ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,SESSION_SECRET=session-secret:latest,ENCRYPTION_KEY=encryption-key:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,MCP_API_KEY=mcp-api-key:latest

echo "Deploy complete: ${IMAGE_URI}"
