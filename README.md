# Elevate Analytics MCP

Production-ready analytics and MCP platform integrating Google Search Console, GA4, PageSpeed Insights, and SEO intelligence.

## Installation

1. Install Node.js 22+.
2. Install dependencies:

```bash
npm ci
```

3. Copy environment template and update values:

```bash
cp .env.example .env
```

4. Validate environment:

```bash
npm run check:env
```

## Development

Run local development server:

```bash
npm run dev
```

Run with Docker Compose:

```bash
docker compose up --build
```

## Google OAuth Setup

1. Create OAuth credentials in Google Cloud Console.
2. Configure authorized callback URL:
	- local: http://localhost:3000/oauth/google/callback
	- production: https://YOUR_CLOUD_RUN_DOMAIN/oauth/google/callback
3. Set these environment variables:
	- GOOGLE_CLIENT_ID
	- GOOGLE_CLIENT_SECRET
	- GOOGLE_REDIRECT_URI

## Search Console Setup

1. Ensure OAuth scope includes https://www.googleapis.com/auth/webmasters.readonly.
2. Add and verify your site property in Search Console.
3. Ensure authenticated Google account has required site permissions.

## GA4 Setup

1. Ensure OAuth scope includes https://www.googleapis.com/auth/analytics.readonly.
2. Retrieve your GA4 property ID.
3. Confirm API access is enabled for the Google Cloud project.

## PageSpeed Setup

1. Enable PageSpeed Insights API in Google Cloud.
2. Set GOOGLE_API_KEY (optional but recommended for quota tracking and reliability).

## Cloud Run Deployment

### Option A: Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml .
```

### Option B: Scripted Deploy

```bash
export GCP_PROJECT_ID=your-project
export GCP_REGION=us-central1
export GCP_SERVICE_NAME=elevate-analytics-mcp
export IMAGE_TAG=$(git rev-parse --short HEAD)
bash scripts/deploy-cloud-run.sh
```

### Secret Manager

Set secrets in Google Secret Manager and bind on deploy:

- jwt-secret
- session-secret
- encryption-key
- google-client-secret
- mcp-api-key

## Claude Custom Connector Configuration

1. Deploy the MCP server endpoint on Cloud Run.
2. Use the Cloud Run HTTPS URL with `/mcp` path in Claude Custom Connector.
3. Provide MCP API key using `x-api-key: <MCP_API_KEY>` (or `Authorization: Bearer <MCP_API_KEY>`).
4. Validate MCP discovery:

```bash
curl -H "x-api-key: YOUR_MCP_API_KEY" https://YOUR_CLOUD_RUN_URL/mcp
```

## Security and Observability

Implemented production controls:

- Helmet security headers
- CORS controls
- Rate limiting
- Compression
- Trusted proxy support
- Secure cookies (in production)
- Structured JSON logging with Pino
- Health probes: /health, /ready, /live, /version
- Prometheus metrics endpoint: /metrics
- MCP endpoint protection with API key middleware (`MCP_API_KEY`)

Collected metrics include:

- Request duration
- Memory usage
- CPU usage
- Process uptime
- Google API latency
- Database latency
- Cache hit ratio
- MCP tool execution time
- MCP tool execution count
- Quota usage events

## Caching

- Set `REDIS_URL` to enable Redis-backed caches.
- If Redis is unavailable, the app falls back to the in-memory cache automatically.

## Tracing

- Set `OTEL_ENABLED=true` to emit OpenTelemetry spans.
- Optional: set `OTEL_SERVICE_NAME` to override the service name.
- Traced operations include OAuth flows, Google APIs, database checks, MCP tools, and incoming HTTP/MCP requests.

## Health Endpoints

- GET /health
- GET /ready
- GET /live

Authenticated endpoints:

- GET /version
- GET /metrics
- GET/POST /mcp

## Environment Variables

Required in all environments:

- DATABASE_URL

Required in production:

- JWT_SECRET
- SESSION_SECRET
- ENCRYPTION_KEY
- MCP_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GCP_PROJECT_ID
- GCP_REGION
- GCP_SERVICE_NAME

Optional but recommended:

- GOOGLE_API_KEY
- METRICS_AUTH_TOKEN
- ALLOWED_ORIGINS
- LOG_LEVEL

## CORS Configuration

- `ALLOWED_ORIGINS` accepts a comma-separated list of browser origins.
- Wildcard origins such as `*` are ignored and never allowed.
- In development, localhost origins such as `http://localhost:3000` and `http://127.0.0.1:3000` are allowed automatically.
- Outside development, localhost origins are rejected.
- Unknown origins are rejected.

## CI/CD

GitHub Actions workflow at `.github/workflows/ci-cd.yml` executes:

1. Install
2. Lint
3. Build
4. Test
5. Docker build
6. Cloud Run deployment (main branch)

Cloud Build pipeline at `cloudbuild.yaml` performs equivalent build and deploy workflow.

## Troubleshooting

1. Startup fails due to missing env vars:
	- Run `npm run check:env`.
2. OAuth callback errors:
	- Verify redirect URI and client credentials.
3. 429/quota errors:
	- Check Google API quotas and logs for quota events.
4. /ready returns non-200:
	- Verify database connectivity and DATABASE_URL.
5. Metrics endpoint unauthorized:
	- Provide `Authorization: Bearer <METRICS_AUTH_TOKEN>` when token is set.
6. MCP endpoint unauthorized:
	- Provide `x-api-key: <MCP_API_KEY>` or `Authorization: Bearer <MCP_API_KEY>`.

## Testing

Run quality gates:

```bash
npm run lint
npm run build
npm test
```

Run production smoke checks:

```bash
bash scripts/production-check.sh http://localhost:3000
```

## Checklists

- Deployment checklist: `docs/deployment-checklist.md`
- Production checklist: `docs/production-checklist.md`
