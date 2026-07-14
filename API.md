# API Endpoints

## Core

- GET /
- GET /health
- GET /health/db
- GET /ready
- GET /live
- GET /version
- GET /metrics

## User

- POST /users
- GET /users

## OAuth

- GET /oauth/google/login
- GET /oauth/google/callback
- POST /oauth/logout
- POST /oauth/disconnect
- GET /oauth/me

## MCP

- GET /mcp
- POST /mcp

## MCP Tool Discovery

MCP tools are available through the MCP protocol endpoint. The server currently registers Search Console, GA4, PageSpeed, SEO intelligence, and AI report generation tools.
