'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadConfig(cwd = process.cwd()) {
  loadEnvFile(path.join(cwd, '.env'));
  loadEnvFile(path.join(cwd, 'agent.env'));

  const agentId = process.env.OBS360_AGENT_ID || process.env.AGENT_ID;
  const agentKey = process.env.OBS360_AGENT_KEY || process.env.AGENT_KEY;
  const apiUrl =
    process.env.OBS360_API_URL ||
    process.env.API_URL ||
    'http://localhost:4000';
  const intervalSec = Number(process.env.OBS360_INTERVAL_SEC || process.env.INTERVAL_SEC || 30);
  const hostname = process.env.OBS360_HOSTNAME || process.env.HOSTNAME || os.hostname();

  if (!agentId || !agentKey) {
    throw new Error(
      'Missing OBS360_AGENT_ID / OBS360_AGENT_KEY. Register an agent in OpsEdge360 UI (/discovery) and copy credentials into agent.env',
    );
  }

  return {
    agentId,
    agentKey,
    apiUrl,
    intervalMs: Math.max(10, intervalSec) * 1000,
    hostname,
    version: process.env.OBS360_AGENT_VERSION || '1.0.0',
  };
}

module.exports = { loadConfig };
