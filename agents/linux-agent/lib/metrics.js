'use strict';

const os = require('os');
const fs = require('fs');

function readCpuSample() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
}

let lastCpu = readCpuSample();

function cpuPct() {
  const current = readCpuSample();
  const idleDelta = current.idle - lastCpu.idle;
  const totalDelta = current.total - lastCpu.total;
  lastCpu = current;
  if (totalDelta <= 0) return 0;
  return Math.round(((totalDelta - idleDelta) / totalDelta) * 1000) / 10;
}

function memoryPct() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 1000) / 10;
}

function diskPct() {
  try {
    const stat = fs.statfsSync('/');
    const total = stat.blocks * stat.bsize;
    const free = stat.bfree * stat.bsize;
    return Math.round(((total - free) / total) * 1000) / 10;
  } catch {
    return 0;
  }
}

async function collectLinuxMetrics() {
  return {
    cpuPct: cpuPct(),
    memoryPct: memoryPct(),
    diskPct: diskPct(),
    load1m: os.loadavg()[0] ?? 0,
    status: 'online',
    labels: { collector: 'linux-agent', distro: os.release() },
  };
}

module.exports = { collectLinuxMetrics };
