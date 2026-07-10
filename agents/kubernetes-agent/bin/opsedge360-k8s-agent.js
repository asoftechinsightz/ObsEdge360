'use strict';

const { AgentClient } = require('@opsedge360/agent-framework');
const { createLogger } = require('@opsedge360/shared-logger');
const { loadConfig } = require('../lib/config');
const { collectKubernetesMetrics } = require('../lib/metrics');

const log = createLogger('kubernetes-agent');

async function main() {
  const config = loadConfig('kubernetes');
  const client = new AgentClient(config);
  const hostname = process.env.KUBERNETES_NODE_NAME ?? process.env.HOSTNAME ?? 'k8s-node';

  if (!config.agentId) {
    const registered = await client.register(hostname);
    config.agentId = registered.agentId;
    config.agentKey = registered.agentKey;
  }

  client.start(async () => collectKubernetesMetrics(), hostname);
  log.info('Kubernetes agent started', { hostname, namespace: process.env.POD_NAMESPACE });

  process.on('SIGINT', () => { client.stop(); process.exit(0); });
}

main().catch((err) => {
  log.fatal('Kubernetes agent failed', err);
  process.exit(1);
});
