# Graph Report - .  (2026-07-21)

## Corpus Check
- Corpus is ~30,826 words - fits in a single context window. You may not need a graph.

## Summary
- 827 nodes · 1691 edges · 51 communities (37 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.81)
- Token cost: 98,331 input · 0 output

## Community Hubs (Navigation)
- Report Generation Engine
- PageSpeed & Performance Analysis
- Search Console Integration
- MCP Server Core & Observability
- SEO Insight Service
- Project Docs & Ops Guides
- NPM Runtime Dependencies
- Cache Layer & GA Cache
- Google Analytics Service
- Dev Tooling Dependencies
- NPM Scripts
- TypeScript Config
- OAuth Service & Encryption
- Prometheus Metrics Definitions
- Database Repositories
- Database & Logging Infra
- Health Check Service
- Google Analytics Repository
- Environment Config Schemas
- Server Bootstrap & Middleware
- Auth Middleware & OAuth Routes
- User Controller
- Content Analyzer
- SEO Analyzer
- Search Console Repository
- Opportunity Engine
- Recommendation Engine
- Trend Analyzer (Services)
- PageSpeed Repository
- Env Check Script
- OAuth Controller
- Security Middleware
- Base Repository
- Express Type Augmentation
- Deploy Script
- Rollback Script
- Cloud Run Deploy Script
- Production Check Script
- MCP Entry Point
- Database Types
- In-Memory Report Cache
- In-Memory GA Cache
- In-Memory PageSpeed Cache
- In-Memory Search Console Cache

## God Nodes (most connected - your core abstractions)
1. `GoogleAnalyticsService` - 40 edges
2. `GoogleAnalyticsReportInput` - 35 edges
3. `PageSpeedService` - 34 edges
4. `SEOInsightService` - 33 edges
5. `SearchConsoleService` - 27 edges
6. `getEnv()` - 26 edges
7. `scripts` - 22 edges
8. `traceAsync()` - 22 edges
9. `SearchConsoleQueryInput` - 22 edges
10. `ReportSnapshot` - 20 edges

## Surprising Connections (you probably didn't know these)
- `CI-CD GitHub Actions Workflow` --semantically_similar_to--> `Cloud Build Pipeline Config`  [INFERRED] [semantically similar]
  .github/workflows/ci-cd.yml → cloudbuild.yaml
- `Deployment Checklist (docs/)` --semantically_similar_to--> `Deployment Guide`  [INFERRED] [semantically similar]
  docs/deployment-checklist.md → DEPLOYMENT.md
- `Production Checklist (docs/)` --semantically_similar_to--> `Production Checklist (root)`  [INFERRED] [semantically similar]
  docs/production-checklist.md → PRODUCTION_CHECKLIST.md
- `Cloud Build Run Log (failed deploy, 2026-07-15)` --shares_data_with--> `Cloud Build Pipeline Config`  [INFERRED]
  build.yaml → cloudbuild.yaml
- `Elevate Analytics MCP (README)` --references--> `Docker Compose Local Dev Config`  [EXTRACTED]
  README.md → docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **2026-07-15 Security Hardening Pass** — security_report_security_report, release_notes_release_notes, production_checklist_production_checklist, readme_google_oauth, production_checklist_jwt_verification, security_report_csrf_hardening, readme_mcp_api_key_auth [INFERRED 0.85]
- **Build-Test-Deploy Pipeline to Cloud Run** — github_workflows_ci_cd_ci_cd_workflow, cloudbuild_cloudbuild_pipeline, build_build_log, readme_cloud_run_deployment, deployment_artifact_registry [INFERRED 0.85]
- **MCP Analytics Tool Integration Surface** — readme_elevate_analytics_mcp, connector_setup_custom_connector_setup, api_api_endpoints, api_mcp_protocol, readme_search_console_integration, readme_ga4_integration, readme_pagespeed_integration, api_seo_intelligence [INFERRED 0.75]

## Communities (51 total, 14 thin omitted)

### Community 0 - "Report Generation Engine"
Cohesion: 0.06
Nodes (38): ActionPlanGenerator, daysFromNow(), clampScore(), ExecutiveSummaryService, ForecastEngine, InsightGenerator, NarrativeBuilder, RecommendationGenerator (+30 more)

### Community 1 - "PageSpeed & Performance Analysis"
Cohesion: 0.06
Nodes (19): ReportRepositoryDependencies, logger, PageSpeedReport, CoreWebVitalsAnalyzer, RedisPageSpeedCache, PageSpeedAnalysisResult, PageSpeedCacheLike, PageSpeedRecommendation (+11 more)

### Community 2 - "Search Console Integration"
Cohesion: 0.12
Nodes (15): RedisSearchConsoleCache, SearchConsoleMapper, SearchConsoleCacheLike, SearchConsoleComparisonResult, SearchConsolePaginatedResult, SearchConsoleRepositoryLike, SearchConsoleRow, SearchConsoleService (+7 more)

### Community 3 - "MCP Server Core & Observability"
Cohesion: 0.09
Nodes (31): getPinoLogger(), getMetricsRegistry(), observeMcpToolExecution(), observeRequestDuration(), extractTraceContextFromHeaders(), getOtlpExporter(), getTracer(), initializeTracing() (+23 more)

### Community 4 - "SEO Insight Service"
Cohesion: 0.10
Nodes (11): AnalyticsSnapshot, SearchConsoleSnapshot, SEOInsightCacheLike, SEOInsightRecommendation, SEOInsightRepository, SEOInsightResult, SEOInsightService, SEOInsightServiceDependencies (+3 more)

### Community 5 - "Project Docs & Ops Guides"
Cohesion: 0.10
Nodes (46): API Endpoints Reference, MCP Protocol Endpoint (/mcp), SEO Intelligence Tools, Cloud Build Run Log (failed deploy, 2026-07-15), Cloud Build Pipeline Config, Claude.ai Custom Connector Setup Guide, Artifact Registry (Docker image storage), Deployment Guide (+38 more)

### Community 6 - "NPM Runtime Dependencies"
Cohesion: 0.04
Nodes (45): compression, cookie-parser, cors, dotenv, express, express-rate-limit, helmet, jsonwebtoken (+37 more)

### Community 7 - "Cache Layer & GA Cache"
Cohesion: 0.07
Nodes (21): CacheEntry, createCloudRunSafeRedisClient(), getSharedRedisClient(), RedisBackedCache, redisReadyState, sharedRedisClients, SyncCache, observeCacheAccess() (+13 more)

### Community 8 - "Google Analytics Service"
Cohesion: 0.13
Nodes (3): GoogleAnalyticsRepositoryLike, GoogleAnalyticsService, GoogleAnalyticsReportInput

### Community 9 - "Dev Tooling Dependencies"
Cohesion: 0.05
Nodes (37): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-import, devDependencies, eslint, eslint-config-prettier, @eslint/js (+29 more)

### Community 10 - "NPM Scripts"
Cohesion: 0.07
Nodes (29): description, engines, node, name, private, scripts, build, check:env (+21 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): dist, ES2022, node, node_modules, src/**/*.ts, compilerOptions, esModuleInterop, forceConsistentCasingInFileNames (+12 more)

### Community 12 - "OAuth Service & Encryption"
Cohesion: 0.21
Nodes (10): getEnv(), decryptValue(), encryptValue(), getKey(), traceAsync(), OAuthCallbackInput, oauthCallbackSchema, createAuthCookieOptions() (+2 more)

### Community 13 - "Prometheus Metrics Definitions"
Cohesion: 0.10
Nodes (16): cacheAccessTotal, cacheHitRatio, cacheStats, databaseLatencyMs, googleApiLatencyMs, googleApiQuotaEvents, lastCpu, mcpToolExecutionCount (+8 more)

### Community 14 - "Database Repositories"
Cohesion: 0.17
Nodes (3): GoogleAccountRepository, OAuthSessionRepository, UserRepository

### Community 15 - "Database & Logging Infra"
Cohesion: 0.19
Nodes (12): createChildLogger(), logger, normalizeMeta(), pinoLogger, wrapLogger(), disconnectPrisma(), globalForPrisma, getActiveTraceContext() (+4 more)

### Community 16 - "Health Check Service"
Cohesion: 0.16
Nodes (12): Env, healthRouter, defaultCheckRedis(), DependencyCheckResult, dependencyStatusSchema, HealthConfig, HealthResponse, healthResponseSchema (+4 more)

### Community 17 - "Google Analytics Repository"
Cohesion: 0.25
Nodes (5): observeGoogleApiLatency(), GoogleAnalyticsProperty, GoogleAnalyticsReportResponse, GoogleAnalyticsRepository, logger

### Community 18 - "Environment Config Schemas"
Cohesion: 0.21
Nodes (9): appConfig, envSchema, optionalApiKeySchema, optionalDatabaseUrlSchema, optionalSecretSchema, optionalStringSchema, ORIGINAL_ENV, validateRequiredEnvOnStartup() (+1 more)

### Community 19 - "Server Bootstrap & Middleware"
Cohesion: 0.19
Nodes (9): getNodeStatsSnapshot(), inputSanitizationMiddleware(), sanitizeValue(), requestTimeoutMiddleware(), userRouter, app, env, server (+1 more)

### Community 20 - "Auth Middleware & OAuth Routes"
Cohesion: 0.33
Nodes (5): AuthenticatedRequest, requireAuth(), requireGoogleAccount(), requireSameSiteOrigin(), oauthRouter

### Community 21 - "User Controller"
Cohesion: 0.20
Nodes (5): UserController, observeDatabaseLatency(), CreateUserInput, createUserSchema, DatabaseService

### Community 22 - "Content Analyzer"
Cohesion: 0.33
Nodes (6): ContentAnalyzer, ContentAnalyzerDependencies, decliningLandingPages(), highBouncePages(), highExitPages(), risingLandingPages()

### Community 23 - "SEO Analyzer"
Cohesion: 0.33
Nodes (6): rankingDropAnalysis(), rankingGrowthAnalysis(), SEOAnalyzer, SEOAnalyzerDependencies, trafficDropAnalysis(), trafficGrowthAnalysis()

### Community 24 - "Search Console Repository"
Cohesion: 0.32
Nodes (4): incrementGoogleApiQuota(), logger, SearchConsoleAnalyticsRow, SearchConsoleRepository

### Community 25 - "Opportunity Engine"
Cohesion: 0.36
Nodes (5): highImpressionLowCTR(), keywordsNearPageOne(), newKeywordOpportunities(), OpportunityEngine, OpportunityEngineDependencies

### Community 26 - "Recommendation Engine"
Cohesion: 0.36
Nodes (5): contentRefreshCandidates(), highImpressionLowCTR(), RecommendationEngine, RecommendationEngineDependencies, trafficDropAnalysis()

### Community 27 - "Trend Analyzer (Services)"
Cohesion: 0.36
Nodes (5): monthlySummary(), quarterlySummary(), TrendAnalyzer, TrendAnalyzerDependencies, weeklySummary()

### Community 29 - "Env Check Script"
Cohesion: 0.40
Nodes (4): missing, requiredAll, requiredProd, weak

### Community 31 - "Security Middleware"
Cohesion: 0.80
Nodes (3): applySecurityMiddleware(), isOriginAllowed(), parseAllowedOrigins()

## Knowledge Gaps
- **191 isolated node(s):** `deploy.sh script`, `name`, `version`, `private`, `type` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SEOInsightService` connect `SEO Insight Service` to `Report Generation Engine`, `PageSpeed & Performance Analysis`, `MCP Server Core & Observability`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `GoogleAnalyticsService` connect `Google Analytics Service` to `Report Generation Engine`, `PageSpeed & Performance Analysis`, `MCP Server Core & Observability`, `Cache Layer & GA Cache`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `PageSpeedService` connect `PageSpeed & Performance Analysis` to `Report Generation Engine`, `MCP Server Core & Observability`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `deploy.sh script`, `name`, `version` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Report Generation Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.06259183073758448 - nodes in this community are weakly interconnected._
- **Should `PageSpeed & Performance Analysis` be split into smaller, more focused modules?**
  _Cohesion score 0.05853174603174603 - nodes in this community are weakly interconnected._
- **Should `Search Console Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._