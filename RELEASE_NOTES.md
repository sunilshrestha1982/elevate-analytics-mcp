# Release Notes

Date: 2026-07-15
Release Type: Security hardening

## Highlights

This release delivers a full production security hardening pass across OAuth, JWT, CSRF, CORS, MCP auth, logging redaction, and input sanitization.

## Security Changes

- OAuth state handling is now atomic and one-time consumable to prevent replay/race reuse.
- Google user profile lookup now sends bearer token in authorization header (not URL query params).
- CSRF origin policy for unsafe methods is stricter in production/staging.
- `/users` routes are now authenticated; write path also enforces same-site origin checks.
- MCP API key validation now uses constant-time comparison.
- Secret policy strengthened:
  - longer minimum lengths for JWT/Session/Encryption secrets
  - minimum length checks for MCP and metrics auth tokens
  - production env checker now rejects weak secrets
- Request sanitization blocks prototype-pollution vector keys.
- Logger redaction expanded to reduce risk of sensitive token leakage.
- JWT middleware now validates claim types after verify.
- JWT issuance now includes `jti` for stronger traceability.

## Compatibility Notes

- Production deployments with weak secret lengths will now fail validation until updated.
- API keys/tokens configured below new minimums must be rotated and replaced.

## Verification

- Build: `npm run build` passed
- Tests: `npm test` passed (13 files, 72 tests)

## Files Added

- SECURITY_REPORT.md
- PRODUCTION_CHECKLIST.md
- RELEASE_NOTES.md
