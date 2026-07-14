# Deployment Checklist

1. Confirm Google Cloud project, region, and Artifact Registry repository are created.
2. Ensure Cloud Run API, Secret Manager API, Cloud Build API, and Monitoring API are enabled.
3. Create Secret Manager secrets:
   - jwt-secret
   - session-secret
   - encryption-key
   - google-client-secret
4. Confirm production environment variables are configured in Cloud Run:
   - DATABASE_URL
   - GOOGLE_CLIENT_ID
   - GOOGLE_REDIRECT_URI
   - GCP_PROJECT_ID
   - GCP_REGION
   - GCP_SERVICE_NAME
5. Run local quality gates:
   - npm run lint
   - npm run build
   - npm test
6. Build and push container image.
7. Deploy image to Cloud Run with --set-secrets and --set-env-vars.
8. Validate endpoints after deploy:
   - /health
   - /ready
   - /live
   - /version
   - /metrics
9. Verify Cloud Logging ingestion (structured JSON entries visible).
10. Verify Cloud Monitoring metrics are scraping /metrics.
11. Validate OAuth callback URL points to Cloud Run domain.
12. Validate MCP endpoint connectivity from Claude Custom Connector.
