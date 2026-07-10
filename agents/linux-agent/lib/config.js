'use strict';

const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function loadConfig(platform) {
  const envPath = path.join(__dirname, '..', 'agent.env');
  const fileEnv = readEnvFile(envPath);
  const env = { ...fileEnv, ...process.env };

  return {
    agentId: env.AGENT_ID ?? '',
    agentKey: env.AGENT_KEY ?? '',
    apiUrl: env.API_URL ?? 'http://localhost:4000',
    platform,
    name: env.AGENT_NAME ?? `opsedge360-${platform}-agent`,
    version: env.AGENT_VERSION ?? '1.0.0',
    heartbeatIntervalMs: Number(env.HEARTBEAT_INTERVAL_MS ?? 30_000),
    configPollIntervalMs: Number(env.CONFIG_POLL_INTERVAL_MS ?? 120_000),
    offlineQueueMaxItems: Number(env.OFFLINE_QUEUE_MAX ?? 1000),
    compressionEnabled: (env.COMPRESSION_ENABLED ?? 'true') === 'true',
    tlsVerify: (env.TLS_VERIFY ?? 'true') === 'true',
    mtlsCertPath: env.MTLS_CERT_PATH,
    mtlsKeyPath: env.MTLS_KEY_PATH,
    mtlsCaPath: env.MTLS_CA_PATH,
    capabilities: (env.AGENT_CAPABILITIES ?? 'host-metrics,heartbeat,config-pull,auto-update').split(','),
    labels: {
      platform,
      environment: env.ENVIRONMENT ?? 'production',
    },
  };
}

module.exports = { loadConfig };
