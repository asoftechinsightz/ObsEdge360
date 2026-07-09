'use strict';

const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

async function sampleCpuPct(sampleMs = 400) {
  const a = cpuTimes();
  await sleep(sampleMs);
  const b = cpuTimes();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  if (totalDelta <= 0) return 0;
  const usage = 1 - idleDelta / totalDelta;
  return Math.round(Math.min(100, Math.max(0, usage * 100)) * 10) / 10;
}

function memoryPct() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return 0;
  return Math.round((1 - free / total) * 1000) / 10;
}

function load1m() {
  const loads = os.loadavg();
  const value = loads[0] ?? 0;
  // Windows returns [0,0,0] — approximate from CPU cores if zero and not linux
  if (value === 0 && process.platform === 'win32') {
    return Math.round((os.cpus().length * 0.3) * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

function diskPct() {
  try {
    if (typeof fs.statfsSync === 'function') {
      const root = process.platform === 'win32' ? (process.env.SystemDrive || 'C:') + '\\' : '/';
      const s = fs.statfsSync(root);
      const total = Number(s.blocks) * Number(s.bsize);
      const free = Number(s.bfree) * Number(s.bsize);
      if (total > 0) return Math.round((1 - free / total) * 1000) / 10;
    }
  } catch {
    // fall through
  }

  // Windows fallback via wmic
  if (process.platform === 'win32') {
    try {
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      });
      const free = Number((out.match(/FreeSpace=(\d+)/) || [])[1] || 0);
      const size = Number((out.match(/Size=(\d+)/) || [])[1] || 0);
      if (size > 0) return Math.round((1 - free / size) * 1000) / 10;
    } catch {
      // ignore
    }
  }

  return 0;
}

/** Best-effort network throughput estimate (Mbps) between samples. */
let lastNet = null;

function readNetBytes() {
  if (process.platform === 'linux') {
    try {
      const text = fs.readFileSync('/proc/net/dev', 'utf8');
      let rx = 0;
      let tx = 0;
      for (const line of text.split('\n').slice(2)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        const iface = parts[0].replace(':', '');
        if (iface === 'lo') continue;
        rx += Number(parts[1]) || 0;
        tx += Number(parts[9]) || 0;
      }
      return { rx, tx, at: Date.now() };
    } catch {
      return null;
    }
  }
  return null;
}

function networkMbps() {
  const now = readNetBytes();
  if (!now) {
    return { networkInMbps: 0, networkOutMbps: 0 };
  }
  if (!lastNet) {
    lastNet = now;
    return { networkInMbps: 0, networkOutMbps: 0 };
  }
  const dt = (now.at - lastNet.at) / 1000;
  if (dt <= 0) return { networkInMbps: 0, networkOutMbps: 0 };
  const inMbps = ((now.rx - lastNet.rx) * 8) / dt / 1e6;
  const outMbps = ((now.tx - lastNet.tx) * 8) / dt / 1e6;
  lastNet = now;
  return {
    networkInMbps: Math.round(Math.max(0, inMbps) * 100) / 100,
    networkOutMbps: Math.round(Math.max(0, outMbps) * 100) / 100,
  };
}

async function collectMetrics() {
  const cpuPct = await sampleCpuPct();
  const net = networkMbps();
  return {
    cpuPct,
    memoryPct: memoryPct(),
    diskPct: diskPct(),
    load1m: load1m(),
    networkInMbps: net.networkInMbps,
    networkOutMbps: net.networkOutMbps,
    status: 'up',
    labels: {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      cores: os.cpus().length,
    },
  };
}

module.exports = { collectMetrics };
