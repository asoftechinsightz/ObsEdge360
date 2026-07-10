'use strict';

const os = require('os');
const { AgentClient } = require('@opsedge360/agent-framework');
const { createLogger } = require('@opsedge360/shared-logger');
const { loadConfig } = require('../lib/config');
const { collectLinuxMetrics } = require('../lib/metrics');

const log = createLogger('linux-agent');

async function main() {
  const config = loadConfig('linux');
  const client = new AgentClient(config, {
    onConfigApplied: (revision) => {
      log.info('Configuration applied', { revision: revision.revision });
    },
  });

  const hostname = os.hostname();
  if (!config.agentId) {
    const registered = await client.register(hostname);
    config.agentId = registered.agentId;
    config.agentKey = registered.agentKey;
    log.info('Agent registered', { agentId: config.agentId });
  }

  client.start(async () => collectLinuxMetrics(), hostname);
  log.info('Linux agent started', { hostname, version: config.version });

  const shutdown = () => {
    client.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.fatal('Linux agent failed', err);
  process.exit(1);
});
