# Deployment Guide

## Prerequisites

1. Google Cloud project with billing enabled.
2. Required APIs enabled:
    - Cloud Run
    - Cloud Build
    - Secret Manager
    - Artifact Registry
    - Cloud Logging
    - Cloud Monitoring
3. Authenticated `gcloud` CLI with permission to manage Cloud Run, Secret Manager, Artifact Registry, and Cloud Build.

## Required Secrets

Create these Secret Manager secrets before deploying:

- `database-url`
- `jwt-secret`
- `session-secret`
- `encryption-key`
- `google-client-id`
- `google-client-secret`
- `mcp-api-key`

Example:

```bash
printf '%s' 'postgresql://USER:PASSWORD@HOST:5432/DB?schema=public' | gcloud secrets create database-url --data-file=-
printf '%s' 'replace-with-32-plus-char-jwt-secret' | gcloud secrets create jwt-secret --data-file=-
printf '%s' 'replace-with-32-plus-char-session-secret' | gcloud secrets create session-secret --data-file=-
printf '%s' 'replace-with-32-plus-char-encryption-key' | gcloud secrets create encryption-key --data-file=-
printf '%s' 'your-google-client-id.apps.googleusercontent.com' | gcloud secrets create google-client-id --data-file=-
printf '%s' 'your-google-client-secret' | gcloud secrets create google-client-secret --data-file=-
printf '%s' 'replace-with-24-plus-char-mcp-api-key' | gcloud secrets create mcp-api-key --data-file=-
```

If a secret already exists, add a new version instead:

```bash
printf '%s' 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-
```

## Google OAuth Setup

1. Create a Web OAuth client in Google Cloud.
2. Add the local callback URL:
    - `http://localhost:8080/oauth/google/callback`
3. Add the Cloud Run callback URL:
    - `https://YOUR_CLOUD_RUN_DOMAIN/oauth/google/callback`
4. Store the OAuth client ID and secret in Secret Manager.
5. Pass the exact production callback URL as `_GOOGLE_REDIRECT_URI` during deployment.

## Cloud Build Deployment

Cloud Build now performs the full deployment chain:

1. Install dependencies.
2. Lint, build, and test.
3. Verify Secret Manager secrets exist.
4. Create Artifact Registry if missing.
5. Build and push the Docker image.
6. Deploy Cloud Run with runtime env vars and Secret Manager bindings.

Deploy with:

```bash
gcloud builds submit \
   --config cloudbuild.yaml \
   --substitutions=_SERVICE_NAME=elevate-analytics-mcp,_REGION=us-central1,_REPOSITORY=elevate-analytics,_GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_DOMAIN/oauth/google/callback,_ALLOWED_ORIGINS=https://YOUR_APP_DOMAIN \
   .
```

No manual Artifact Registry creation is required.

## Direct Script Deployment

```bash
export GCP_PROJECT_ID=your-project
export GCP_REGION=us-central1
export GCP_SERVICE_NAME=elevate-analytics-mcp
export GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_DOMAIN/oauth/google/callback
export ALLOWED_ORIGINS=https://YOUR_APP_DOMAIN
bash deploy.sh
```

## Runtime Configuration

Cloud Run receives these environment variables:

- `NODE_ENV=production`
- `PORT=8080`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_SERVICE_NAME`
- `GOOGLE_REDIRECT_URI`
- `ALLOWED_ORIGINS`

Cloud Run receives these secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MCP_API_KEY`

## Post-Deploy Validation

Verify endpoints:

- `GET /live`
- `GET /ready`
- `GET /health`
- `GET /version`

Run the local smoke script against the deployed service URL:

```bash
bash scripts/production-check.sh https://YOUR_CLOUD_RUN_DOMAIN
```

Verify MCP discovery with the API key:

```bash
curl -H 'x-api-key: YOUR_MCP_API_KEY' https://YOUR_CLOUD_RUN_DOMAIN/mcp
```

## Troubleshooting

- Deployment fails with missing secrets:
   Create the required Secret Manager entries listed above.
- Container exits on startup:
   Confirm `GOOGLE_REDIRECT_URI`, `GCP_PROJECT_ID`, `GCP_REGION`, and `GCP_SERVICE_NAME` are being passed to Cloud Run.
- OAuth fails after deploy:
   Ensure the callback URL in Google OAuth matches `_GOOGLE_REDIRECT_URI` exactly.
- Browser requests fail CORS:
   Pass a comma-separated `_ALLOWED_ORIGINS` substitution.
- Ready endpoint returns `503`:
   Check `DATABASE_URL`, Prisma connectivity, and OAuth configuration.
