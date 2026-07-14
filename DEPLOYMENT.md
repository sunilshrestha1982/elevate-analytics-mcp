# Deployment Guide

## Prerequisites

1. Google Cloud project with billing enabled.
2. APIs enabled:
   - Cloud Run
   - Cloud Build
   - Secret Manager
   - Artifact Registry
   - Cloud Logging
   - Cloud Monitoring
3. Artifact Registry repository created:
   - elevate-analytics

## Secrets

Create Secret Manager entries:

- jwt-secret
- session-secret
- encryption-key
- google-client-secret

## Environment Profiles

- development
- staging
- production

Production and staging require:

- DATABASE_URL
- JWT_SECRET
- SESSION_SECRET
- ENCRYPTION_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GCP_PROJECT_ID
- GCP_REGION
- GCP_SERVICE_NAME

## Deploy with Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml .
```

## Deploy with Script

```bash
export GCP_PROJECT_ID=your-project
export GCP_REGION=us-central1
export GCP_SERVICE_NAME=elevate-analytics-mcp
bash deploy.sh
```

## Rollback

```bash
export GCP_PROJECT_ID=your-project
export GCP_REGION=us-central1
export GCP_SERVICE_NAME=elevate-analytics-mcp
export REVISION=elevate-analytics-mcp-00012-abc
bash rollback.sh
```

## Post Deploy Checks

- GET /health
- GET /ready
- GET /live
- GET /version
- GET /metrics
- MCP discovery on /mcp
