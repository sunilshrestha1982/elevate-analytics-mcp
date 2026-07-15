# SECURITY REPORT

Date: 2026-07-15
Scope: OAuth, JWT, Cookies, CSRF, PKCE, CORS, Secrets, Docker, Cloud Run, Google tokens, MCP, Logging, injection/race/encryption checks.

## Executive Summary

A production security audit was completed and code-level fixes were applied for identified high/medium risks.

Overall status: improved and deployable with residual operational actions listed below.

## Findings And Fixes

1. OAuth state replay / race condition
- Risk: OAuth `state` could be re-used in concurrent flows due to non-atomic read/delete pattern.
- Fix: replaced read-then-delete with atomic one-time consume by state.
- Files:
  - src/repositories/oauthSessionRepository.ts
  - src/services/oauthService.ts

2. Google access token exposure risk in URL
- Risk: access token was sent to Google userinfo endpoint via query string.
- Fix: switched to `Authorization: Bearer` header.
- Files:
  - src/services/oauthService.ts

3. CSRF hardening for state-changing requests
- Risk: missing origin metadata accepted for unsafe methods in production/staging.
- Fix: `requireSameSiteOrigin` now enforces origin/referer presence for non-safe methods in production/staging.
- Files:
  - src/middleware/auth.ts
  - src/middleware/auth.test.ts

4. Unauthorized data access on user routes
- Risk: `/users` endpoints were public.
- Fix: added `requireAuth` to read operations and `requireAuth + requireSameSiteOrigin` to write operations.
- Files:
  - src/routes/users.ts

5. MCP API key timing side-channel
- Risk: direct string comparison for API keys.
- Fix: implemented constant-time comparison with `timingSafeEqual` and length checks.
- Files:
  - src/middleware/mcpApiKeyAuth.ts

6. Weak secret policy
- Risk: minimum lengths too low for production secrets/tokens.
- Fix:
  - environment schema now enforces stronger minimums for secrets and API tokens.
  - production env checker validates minimum secret lengths and fails fast.
- Files:
  - src/config/env.ts
  - scripts/check-env.mjs

7. Sensitive log redaction coverage
- Risk: partial redaction set left additional secret-bearing fields exposed.
- Fix: expanded redaction paths for auth artifacts and token-adjacent fields.
- Files:
  - src/lib/logger.ts

8. Injection / object pollution hardening
- Risk: nested object sanitization did not block `__proto__`, `constructor`, `prototype` keys.
- Fix: blocked prototype-pollution keys in request sanitization middleware.
- Files:
  - src/middleware/inputSanitization.ts

9. JWT claim validation hardening
- Risk: middleware trusted decoded JWT claim types without extra validation.
- Fix: added strict runtime checks for `sub` and `email` claims after verify.
- Files:
  - src/middleware/auth.ts

10. JWT token issuance hardening
- Improvement: added `jti` (JWT ID) at issuance for better revocation/audit correlation.
- Files:
  - src/services/oauthService.ts

## Areas Reviewed

- OAuth: login/callback/refresh/disconnect flows, PKCE verifier/challenge, state lifecycle.
- JWT: verify options, claim checks, token issuance properties.
- Cookies: `httpOnly`, `secure`, `sameSite`, clear behavior.
- CSRF: same-site origin enforcement on unsafe methods.
- PKCE: S256 challenge and verifier generation/usage.
- CORS: explicit allowlist behavior and unknown origin rejection.
- Secrets: env schema + startup checker + Cloud Run secret wiring.
- Docker: non-root runtime and minimized runtime image reviewed.
- Cloud Run: authenticated deploy and Secret Manager usage reviewed.
- Google tokens: encryption at rest and transport handling reviewed.
- MCP: API-key guard and protected endpoint checks reviewed.
- Logging: structured logs + redaction review.

## Hardcoded Secrets Scan

- No production hardcoded secrets were introduced in source code.
- Test fixtures use synthetic values only.

## Residual Risks / Follow-Ups

1. Add automated secret scanning (e.g., gitleaks) to CI.
2. Add key rotation runbook and token revocation strategy for compromised credentials.
3. Add explicit CSRF token pattern (double-submit or synchronizer token) if browser interaction surface expands.
4. Add periodic dependency vulnerability remediation process (`npm audit` currently reports known issues).

## Validation

- `npm run build`: passed
- `npm test`: passed (13 files, 72 tests)
