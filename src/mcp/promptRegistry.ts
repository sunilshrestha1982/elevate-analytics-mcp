import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Logger } from './logger.js';

export interface PromptRegistry {
  registerAll(): void;
}

export function createPromptRegistry(server: McpServer, logger: Logger): PromptRegistry {
  return {
    registerAll() {
      (server.prompt as any).call(server, 'seo-summary', 'Summarize SEO performance', {
        userId: z.number().optional(),
        siteUrl: z.string().optional(),
        propertyId: z.string().optional(),
      }, async ({ userId, siteUrl, propertyId }: { userId?: number; siteUrl?: string; propertyId?: string }) => ({
        messages: [{ role: 'user', content: { type: 'text', text: `Summarize SEO health for ${siteUrl ?? 'the site'} using user ${userId ?? 0} and property ${propertyId ?? 'unknown'}.` } }],
      }));
      logger.info('Registered MCP prompts');
    },
  };
}
