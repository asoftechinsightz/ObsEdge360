'use strict';

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function createClient(config) {
  const base = config.apiUrl.replace(/\/$/, '');
  const headers = { 'X-Agent-Key': config.agentKey };

  return {
    async sendHeartbeatWithMetrics(payload) {
      return postJson(
        `${base}/api/v1/discovery/agents/${config.agentId}/heartbeat`,
        headers,
        payload,
      );
    },
  };
}

module.exports = { createClient };
