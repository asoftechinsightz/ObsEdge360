'use strict';

const os = require('os');
const { execSync } = require('child_process');

function sysctl(key) {
  try {
    return execSync(`sysctl -n ${key}`, { encoding: 'utf8', timeout: 3000 }).trim();
  } catch {
    return '';
  }
}

async function collectMacMetrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const load = sysctl('vm.loadavg').split(' ').filter(Boolean);
  return {
    cpuPct: 0,
    memoryPct: Math.round(((total - free) / total) * 1000) / 10,
    diskPct: 0,
    load1m: Number(load[1] ?? os.loadavg()[0] ?? 0),
    status: 'online',
    labels: { collector: 'mac-agent', darwin: os.release() },
  };
}

module.exports = { collectMacMetrics };
