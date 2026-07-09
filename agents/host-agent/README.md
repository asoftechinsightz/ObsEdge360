# OpsEdge360 Host Agent

Single package that runs on **target servers** and sends:

1. **Heartbeat** — agent online/offline in `/discovery`  
2. **Real host metrics** — CPU, memory, disk, load, network → `/observability` Hosts

No JWT required. Uses `X-Agent-Key` only.

---

## Prerequisites

- Node.js **18+** on the target server  
- OpsEdge360 API reachable (HTTP/HTTPS)  
- Agent registered in the console

---

## 1. Register the agent (console)

1. Open OpsEdge360 → **Discovery** → **Agents**  
2. Click **Register agent** (name e.g. `web-01`)  
3. Copy **Agent ID** and **Agent Key** (key shown once)

---

## 2. Install on the target server

Copy the `agents/host-agent` folder to the server, or clone the repo.

```bash
cd agents/host-agent
cp agent.env.example agent.env
# edit agent.env — set OBS360_API_URL, OBS360_AGENT_ID, OBS360_AGENT_KEY
```

### Run once (test)

```bash
node bin/opsedge360-agent.js --once
```

Expected log:

```text
[opsedge360-agent] ok host=... cpu=12.3% mem=45.1% disk=55.0% load=0.4 metrics=true
```

### Run continuously

```bash
node bin/opsedge360-agent.js
```

Default interval: **30 seconds** (`OBS360_INTERVAL_SEC`).

---

## 3. Run as a service

### Linux (systemd)

```bash
sudo cp agents/host-agent /opt/opsedge360-agent -r
sudo cp /opt/opsedge360-agent/agent.env.example /opt/opsedge360-agent/agent.env
# edit /opt/opsedge360-agent/agent.env

sudo tee /etc/systemd/system/opsedge360-agent.service >/dev/null <<'EOF'
[Unit]
Description=OpsEdge360 Host Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/opsedge360-agent
ExecStart=/usr/bin/node /opt/opsedge360-agent/bin/opsedge360-agent.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now opsedge360-agent
sudo journalctl -u opsedge360-agent -f
```

### Windows (Task Scheduler / NSSM)

```powershell
cd C:\opsedge360-agent
copy agent.env.example agent.env
# edit agent.env

# Run in background with NSSM or:
node bin\opsedge360-agent.js
```

Or schedule:

```powershell
schtasks /Create /TN "OpsEdge360Agent" /SC ONSTART /RL HIGHEST /TR "node C:\opsedge360-agent\bin\opsedge360-agent.js"
```

---

## Metrics collected (real)

| Metric | Source |
|--------|--------|
| `cpuPct` | OS CPU sample (idle delta) |
| `memoryPct` | `os.totalmem` / `os.freemem` |
| `diskPct` | `fs.statfs` (Linux/macOS) or WMIC (Windows `C:`) |
| `load1m` | `os.loadavg` (approx on Windows) |
| `networkInMbps` / `networkOutMbps` | `/proc/net/dev` on Linux (0 on Windows in v1) |
| `status` | `up` |

---

## API used

```http
POST /api/v1/discovery/agents/{agentId}/heartbeat
X-Agent-Key: {agentKey}
Content-Type: application/json

{
  "hostname": "web-01",
  "version": "1.0.0",
  "status": "online",
  "metrics": {
    "cpuPct": 12.5,
    "memoryPct": 48.2,
    "diskPct": 55.0,
    "load1m": 0.4,
    "networkInMbps": 1.2,
    "networkOutMbps": 0.8,
    "status": "up"
  }
}
```

Also available: `POST .../agents/{id}/metrics` (same payload shape).

---

## Verify in console

1. **Discovery → Agents** — agent shows **online**  
2. **Observability → Hosts** — hostname row with live CPU/memory/disk  
3. **Observability → Alerts** — rules on `cpu_pct` / `memory_pct` can fire  

---

## Firewall

Allow **outbound HTTPS** (or HTTP in lab) from the target to `OBS360_API_URL`.

| Mode | Typical API URL |
|------|-----------------|
| Local | `http://localhost:4000` (or host LAN IP) |
| SaaS | `https://api.observability360.asoftechinsightz.com` |
| On-prem | `https://opsedge360-api.internal.company.com` |
