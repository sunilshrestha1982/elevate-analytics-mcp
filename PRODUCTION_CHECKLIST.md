# PRODUCTION CHECKLIST

Date: 2026-07-15

## Security Controls

- [x] OAuth state is one-time consumable (replay resistant)
- [x] PKCE uses S256 with high-entropy verifier
- [x] JWT verification enforces algorithm, issuer, audience
- [x] JWT claim type validation in auth middleware
- [x] Auth cookie uses `httpOnly`
- [x] Auth cookie secure mode enabled outside development (or via explicit override)
- [x] CSRF same-site origin checks enforced for unsafe methods in production/staging
- [x] CORS allowlist is explicit and wildcard-free
- [x] MCP API key comparison is constant-time
- [x] Request sanitization blocks prototype-pollution keys
- [x] Sensitive fields are redacted in structured logs

## Secrets And Configuration

- [x] Secrets sourced from env/Secret Manager (no hardcoded prod secrets)
- [x] Production env validation fails on missing required vars
- [x] Production env validation fails on weak secret length
- [ ] Secret rotation cadence documented and scheduled
- [ ] Emergency credential revocation runbook documented

## Cloud Run / Runtime

- [x] Cloud Run deploy disallows unauthenticated invocation
- [x] Cloud Run deploy binds required secrets
- [x] Container runs as non-root user
- [x] Container healthcheck configured
- [x] Runtime image excludes non-essential build files

## Token And Data Protection

- [x] Google refresh/access tokens encrypted at rest
- [x] Google access token no longer passed in URL query string
- [x] OAuth callback rejects invalid/expired state

## Monitoring And Auditability

- [x] Structured logs include request/trace IDs
- [x] Error IDs included for major failure paths
- [x] Security-sensitive routes covered by tests

## Quality Gates

- [x] `npm run build` passed
- [x] `npm test` passed

## Release Decision

- [x] Approved for controlled production rollout
- [ ] Schedule post-deploy security verification (logs, auth, OAuth callback, MCP auth)
