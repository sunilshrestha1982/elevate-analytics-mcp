# Claude.ai Custom Connector Setup

## MCP Endpoint

Use your Cloud Run URL with `/mcp` suffix.

Example:

`https://elevate-analytics-mcp-xxxxx-uc.a.run.app/mcp`

## Steps

1. Deploy service to Cloud Run.
2. Open Claude.ai Custom Connector setup.
3. Configure MCP endpoint URL to Cloud Run `/mcp`.
4. Add authorization header if your environment enforces it.
5. Validate tool discovery and run a simple tool call.

## Required Backing Config

- OAuth credentials configured
- Search Console scope enabled
- GA4 scope enabled
- PageSpeed API enabled

## Troubleshooting

- If discovery fails, verify `/mcp` responds with protocol metadata.
- If tool execution fails, check Cloud Logging for tool error details.
