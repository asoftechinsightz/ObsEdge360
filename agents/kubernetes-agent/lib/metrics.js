'use strict';

const fs = require('fs');

function readCgroupCpu() {
  const paths = [
    '/sys/fs/cgroup/cpu.stat',
    '/sys/fs/cgroup/cpu/cpu.stat',
  ];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    const usage = content.match(/usage_usec\s+(\d+)/);
    if (usage) return Number(usage[1]);
  }
  return 0;
}

function readCgroupMemory() {
  const paths = [
    '/sys/fs/cgroup/memory.current',
    '/sys/fs/cgroup/memory/memory.usage_in_bytes',
  ];
  const limitPaths = [
    '/sys/fs/cgroup/memory.max',
    '/sys/fs/cgroup/memory/memory.limit_in_bytes',
  ];
  let usage = 0;
  let limit = 0;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      usage = Number(fs.readFileSync(p, 'utf8').trim());
      break;
    }
  }
  for (const p of limitPaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8').trim();
      if (raw !== 'max') limit = Number(raw);
      break;
    }
  }
  if (!limit || limit <= 0) return 0;
  return Math.round((usage / limit) * 1000) / 10;
}

async function collectKubernetesMetrics() {
  return {
    cpuPct: 0,
    memoryPct: readCgroupMemory(),
    diskPct: 0,
    status: 'online',
    labels: {
      collector: 'kubernetes-agent',
      pod: process.env.HOSTNAME,
      namespace: process.env.POD_NAMESPACE,
      node: process.env.KUBERNETES_NODE_NAME,
      cgroupCpu: readCgroupCpu(),
    },
  };
}

module.exports = { collectKubernetesMetrics };
