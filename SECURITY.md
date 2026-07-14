# Security Guide

## Implemented Controls

- Helmet security headers
- CORS policy controls
- Compression
- Rate limiting
- Trusted proxy support
- Secure cookies
- HttpOnly cookies
- SameSite cookies
- Input sanitization middleware
- Request validation with Zod in route/service boundaries
- Response validation for system health payloads

## Cookie Policy

Auth cookies are configured with:

- httpOnly=true
- secure=true in staging/production by default
- sameSite controlled via COOKIE_SAMESITE

## Trusted Proxy

`trust proxy` is enabled in hop mode when configured, which is compatible with Cloud Run ingress and IP-based rate limiting.

## Recommended Hardening

1. Restrict CORS_ORIGIN in production.
2. Set METRICS_AUTH_TOKEN to protect /metrics.
3. Rotate JWT/SESSION/ENCRYPTION secrets regularly.
4. Use VPC connectors and private egress for database access.
5. Configure Cloud Armor in front of Cloud Run for additional edge controls.
