'use strict';

const os = require('os');
const { execSync } = require('child_process');

function wmiQuery() {
  if (process.platform !== 'win32') {
    return { cpuPct: 0, memoryPct: 0, diskPct: 0 };
  }
  try {
    const cpuRaw = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"',
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    const memRaw = execSync(
      'powershell -NoProfile -Command "$o=Get-CimInstance Win32_OperatingSystem; [math]::Round((($o.TotalVisibleMemorySize-$o.FreePhysicalMemory)/$o.TotalVisibleMemorySize)*100,1)"',
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    const diskRaw = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\" | ForEach-Object { [math]::Round((($_.Size-$_.FreeSpace)/$_.Size)*100,1) })"',
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    return {
      cpuPct: Number(cpuRaw) || 0,
      memoryPct: Number(memRaw) || 0,
      diskPct: Number(diskRaw) || 0,
    };
  } catch {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      cpuPct: 0,
      memoryPct: Math.round(((total - free) / total) * 1000) / 10,
      diskPct: 0,
    };
  }
}

async function collectWindowsMetrics() {
  const wmi = wmiQuery();
  return {
    ...wmi,
    load1m: os.loadavg()[0] ?? 0,
    status: 'online',
    labels: { collector: 'windows-agent', wmi: true },
  };
}

module.exports = { collectWindowsMetrics };
