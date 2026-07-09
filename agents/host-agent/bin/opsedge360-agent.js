#!/usr/bin/env node
'use strict';

/**
 * OpsEdge360 host agent
 * Sends heartbeat + real host metrics in one request.
 *
 * Usage:
 *   node bin/opsedge360-agent.js           # loop
 *   node bin/opsedge360-agent.js --once    # single report
 */

const path = require('path');
const { loadConfig } = require('../lib/config');
const { collectMetrics } = require('../lib/metrics');
const { createClient } = require('../lib/client');

const once = process.argv.includes('--once');

async function report(config, client) {
  const metrics = await collectMetrics();
  const result = await client.sendHeartbeatWithMetrics({
    hostname: config.hostname,
    version: config.version,
    status: 'online',
    metadata: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      pid: process.pid,
    },
    metrics,
  });

  const m = metrics;
  console.log(
    `[opsedge360-agent] ok host=${config.hostname} cpu=${m.cpuPct}% mem=${m.memoryPct}% disk=${m.diskPct}% load=${m.load1m} metrics=${result.metricsIngested}`,
  );
  return result;
}

async function main() {
  const config = loadConfig(path.resolve(process.cwd()));
  const client = createClient(config);

  console.log(
    `[opsedge360-agent] starting agentId=${config.agentId} api=${config.apiUrl} interval=${config.intervalMs / 1000}s`,
  );

  if (once) {
    await report(config, client);
    return;
  }

  // Prime network counters, then loop
  await collectMetrics();

  const tick = async () => {
    try {
      await report(config, client);
    } catch (err) {
      console.error(`[opsedge360-agent] error: ${err.message}`);
    }
  };

  await tick();
  setInterval(tick, config.intervalMs);
}

main().catch((err) => {
  console.error(`[opsedge360-agent] fatal: ${err.message}`);
  process.exit(1);
});
