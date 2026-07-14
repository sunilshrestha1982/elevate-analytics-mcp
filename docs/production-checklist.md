# Production Checklist

1. Node runtime pinned to version 22.
2. Docker image uses non-root user.
3. Security middleware enabled:
   - Helmet
   - CORS
   - Rate limiting
   - Compression
   - Trusted proxy
4. Secure cookie behavior verified in production (secure + httpOnly + sameSite).
5. Fail-fast environment validation enabled at startup.
6. Structured logging enabled with Pino.
7. Request duration and API latency metrics enabled.
8. Google quota usage events are logged and metered.
9. MCP tool execution metrics enabled.
10. Graceful shutdown handling validated for SIGTERM/SIGINT.
11. CI/CD pipeline executes install, lint, build, test, docker build, deploy.
12. Secret Manager wired into deployment.
13. /ready and /health integrated with Cloud Run health checks.
14. Cloud Logging retention and alerts configured.
15. Cloud Monitoring alerts configured for:
    - Error rates
    - Latency spikes
    - Memory growth
    - CPU saturation
    - Quota anomalies
