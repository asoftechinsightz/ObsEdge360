'use strict';

const { AgentClient } = require('@opsedge360/agent-framework');
const { createLogger } = require('@opsedge360/shared-logger');
const { loadConfig } = require('../lib/config');
const { collectDockerMetrics } = require('../lib/metrics');

const log = createLogger('docker-agent');

async function main() {
  const config = loadConfig('docker');
  const client = new AgentClient(config);
  const hostname = process.env.HOSTNAME ?? 'docker-host';

  if (!config.agentId) {
    const registered = await client.register(hostname);
    config.agentId = registered.agentId;
    config.agentKey = registered.agentKey;
  }

  client.start(async () => collectDockerMetrics(), hostname);
  log.info('Docker agent started', { hostname });

  process.on('SIGINT', () => { client.stop(); process.exit(0); });
}

main().catch((err) => {
  log.fatal('Docker agent failed', err);
  process.exit(1);
});
