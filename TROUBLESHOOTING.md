# Troubleshooting

## Startup fails with missing env vars

Run:

```bash
npm run check:env
```

## /ready returns not_ready

- Verify database connectivity.
- Verify DATABASE_URL.

## OAuth login fails

- Verify GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
- Verify redirect URI in Google Console matches deployed callback URL.

## Search Console / GA4 calls fail

- Verify OAuth consent scopes.
- Verify user has property/site access.
- Check Google API quota usage logs.

## /metrics unauthorized

Provide `Authorization: Bearer <METRICS_AUTH_TOKEN>` when token is configured.

## MCP tool discovery fails

- Verify endpoint is `/mcp`.
- Verify Cloud Run ingress and auth configuration.
- Inspect Cloud Logging for MCP router errors.
