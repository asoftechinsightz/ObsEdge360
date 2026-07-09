# Live Prometheus scrape & remote_write

OpsEdge360 can **pull** Prometheus exposition endpoints and **accept push** (remote_write-style) metrics.

---

## 1. Live scrape (pull)

OpsEdge360 HTTP-GETs each target’s `/metrics` (Prometheus text format), parses samples, and:

- Stores samples in `prometheus_samples`
- Derives host metrics (CPU, memory, disk, load) for **Hosts** dashboard
- Updates scrape target status (`success` / `partial` / `error`)

### Setup

1. Install **node_exporter** (or any Prometheus exporter) on the host:

```bash
# Linux example
./node_exporter --web.listen-address=":9100"
```

2. In UI: **Observability → Scrape targets**
   - Name: `web-01`
   - Targets: `web-01.prod.local:9100`
   - Metrics path: `/metrics` (default)
3. Click **Play** (live scrape) or **Scrape all**
4. Check **Hosts** tab for CPU/memory/disk

### Auto scrape

Background scheduler runs every **30s** (`PROMETHEUS_SCRAPE_SCHEDULER_MS`). Disable with:

```env
PROMETHEUS_SCRAPE_SCHEDULER=false
```

### Network

The **OpsEdge360 observability service** must reach `host:port` (firewall allow from platform → targets).

| Mode | Reachability |
|------|----------------|
| SaaS | Platform scrapes public/VPN exporters, or use remote_write push |
| Hybrid | Scrape from regional data plane |
| On-prem | Scrape on LAN |

### Mapped metrics (node_exporter)

| Host field | Prometheus series |
|------------|-------------------|
| CPU % | `node_cpu_seconds_total` (idle rate; needs **2 scrapes**) |
| Memory % | `MemTotal` / `MemAvailable` |
| Disk % | `node_filesystem_*` (`/` or `C:`) |
| Load | `node_load1` |
| Status | `up` |

---

## 2. Remote write (push)

### JSON / text API (recommended)

```http
POST /api/v1/observability/prometheus/write
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "job": "node",
  "instance": "web-01:9100",
  "metrics": "node_load1 0.42\nnode_memory_MemTotal_bytes 8589934592\nnode_memory_MemAvailable_bytes 4294967296\n"
}
```

Or timeseries JSON:

```json
{
  "timeseries": [
    {
      "labels": { "__name__": "node_load1", "instance": "web-01:9100" },
      "samples": [{ "value": 0.42 }]
    }
  ]
}
```

Alias: `POST /api/v1/observability/prometheus/remote_write`

### Direct to observability service (text/plain)

```bash
curl -X POST "http://localhost:4003/prometheus/remote_write" \
  -H "X-Tenant-ID: default" \
  -H "Content-Type: text/plain" \
  -H "Accept: application/json" \
  --data-binary @metrics.txt
```

### Native Prometheus `remote_write` (protobuf + snappy)

Stock Prometheus speaks **protobuf + snappy**, not JSON. Options:

1. **Prefer live scrape** (OpsEdge360 pulls exporters) — no remote_write needed  
2. Use **Vector / Grafana Agent / Alloy** to transform and POST JSON/text to `/prometheus/write`  
3. Host agent (`agents/host-agent`) for host metrics without Prometheus  

---

## 3. Example Prometheus config (external Prometheus)

If you run Prometheus yourself and only want OpsEdge360 as a target list reference, use the generated fragment from the UI. To **push into OpsEdge360**, use a pipeline:

```yaml
# grafana agent / alloy style (conceptual)
remote_write:
  - url: https://api.observability360.../api/v1/observability/prometheus/write
    headers:
      Authorization: Bearer <JWT>
```

(Configure the agent to send JSON/text compatible with our write API.)

---

## Verify

```bash
# After live scrape
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/observability/hosts

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/observability/prometheus/samples
```
