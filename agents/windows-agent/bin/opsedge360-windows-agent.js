'use strict';

const os = require('os');
const { execSync } = require('child_process');
const { AgentClient } = require('@opsedge360/agent-framework');
const { createLogger } = require('@opsedge360/shared-logger');
const { loadConfig } = require('../lib/config');
const { collectWindowsMetrics } = require('../lib/metrics');

const log = createLogger('windows-agent');

async function main() {
  const config = loadConfig('windows');
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

  client.start(async () => collectWindowsMetrics(), hostname);
  log.info('Windows agent started', { hostname, version: config.version });

  const shutdown = () => {
    client.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.platform !== 'win32') {
  log.warn('Windows agent running on non-Windows platform; WMI metrics may be unavailable');
}

main().catch((err) => {
  log.fatal('Windows agent failed', err);
  process.exit(1);
});
