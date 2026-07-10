'use strict';

const { execSync } = require('child_process');

function dockerInfo() {
  try {
    const containers = Number(
      execSync('docker ps -q | wc -l', { encoding: 'utf8', timeout: 5000 }).trim(),
    );
    const stats = execSync(
      'docker stats --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}"',
      { encoding: 'utf8', timeout: 10000 },
    ).trim().split('\n').filter(Boolean);

    let cpuSum = 0;
    let memSum = 0;
    for (const line of stats) {
      const [cpu, mem] = line.split('|');
      cpuSum += Number((cpu ?? '0').replace('%', '')) || 0;
      memSum += Number((mem ?? '0').replace('%', '')) || 0;
    }
    const count = stats.length || 1;
    return {
      cpuPct: Math.round((cpuSum / count) * 10) / 10,
      memoryPct: Math.round((memSum / count) * 10) / 10,
      labels: { collector: 'docker-agent', containers },
    };
  } catch {
    return { cpuPct: 0, memoryPct: 0, labels: { collector: 'docker-agent', containers: 0 } };
  }
}

async function collectDockerMetrics() {
  const info = dockerInfo();
  return {
    cpuPct: info.cpuPct,
    memoryPct: info.memoryPct,
    diskPct: 0,
    status: 'online',
    labels: info.labels,
  };
}

module.exports = { collectDockerMetrics };
