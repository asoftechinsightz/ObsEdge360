'use strict';

const os = require('os');
const { AgentClient } = require('@opsedge360/agent-framework');
const { createLogger } = require('@opsedge360/shared-logger');
const { loadConfig } = require('../lib/config');
const { collectMacMetrics } = require('../lib/metrics');

const log = createLogger('mac-agent');

async function main() {
  const config = loadConfig('mac');
  const client = new AgentClient(config);

  const hostname = os.hostname();
  if (!config.agentId) {
    const registered = await client.register(hostname);
    config.agentId = registered.agentId;
    config.agentKey = registered.agentKey;
  }

  client.start(async () => collectMacMetrics(), hostname);
  log.info('macOS agent started', { hostname });

  process.on('SIGINT', () => { client.stop(); process.exit(0); });
  process.on('SIGTERM', () => { client.stop(); process.exit(0); });
}

main().catch((err) => {
  log.fatal('macOS agent failed', err);
  process.exit(1);
});
