#!/usr/bin/env node
'use strict';

/**
 * OpsEdge360 Universal Agent entrypoint.
 *
 * Env:
 *   API_URL              Gateway base (https://api... ) without /api/v1
 *   AGENT_ID / AGENT_KEY Pre-registered credentials
 *   BOOTSTRAP_TOKEN      One-time enrollment token
 *   AGENT_NAME           Display name
 *   AGENT_DATA_DIR       Durable queue directory
 *   AGENT_HEALTH_PORT    Local health HTTP port (optional)
 *   AGENT_VERSION        Agent version string
 */

const path = require('path');

async function main() {
  // Resolve workspace package when running from monorepo
  let UniversalAgent;
  try {
    ({ UniversalAgent } = require('@opsedge360/agent-framework'));
  } catch {
    ({ UniversalAgent } = require(path.resolve(__dirname, '../../packages/agent-framework/dist')));
  }

  const apiUrl = process.env.API_URL || process.env.OPSEDGE_API_URL;
  if (!apiUrl) {
    console.error('API_URL is required');
    process.exit(1);
  }

  const agent = new UniversalAgent({
    apiUrl,
    agentId: process.env.AGENT_ID,
    agentKey: process.env.AGENT_KEY,
    bootstrapToken: process.env.BOOTSTRAP_TOKEN,
    name: process.env.AGENT_NAME,
    dataDir: process.env.AGENT_DATA_DIR || path.join(process.cwd(), '.opsedge360-agent'),
    version: process.env.AGENT_VERSION || '1.0.0',
    healthPort: process.env.AGENT_HEALTH_PORT ? Number(process.env.AGENT_HEALTH_PORT) : undefined,
  });

  const shutdown = () => {
    agent.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await agent.start();
  console.log('OpsEdge360 Universal Agent running');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
