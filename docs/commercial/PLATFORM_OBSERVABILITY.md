# Platform Self-Observability

OpsEdge360 must observe itself for commercial operations.

## Built-in health surfaces

| Endpoint | Use |
|----------|-----|
| `GET /api/v1/health` | Aggregate service health |
| `GET /api/v1/ready` | Readiness |
| `GET /api/v1/live` | Liveness |
| `GET /api/v1/version` | Version / build |
| `GET /api/v1/metrics` | Prometheus-style metrics scrape |

Compose healthchecks already probe service `/health` in `docker-compose.prod.yml`.

## Prometheus

Config scaffold: `infra/monitoring/prometheus.yml`

Scrape targets should include:

- API gateway metrics  
- Node/container exporters (customer-provided)  
- Postgres exporter (optional)

## Recommended operator dashboard panels

1. API gateway availability (health success ratio)  
2. Request latency p95 (from APM / metrics)  
3. Auth failures / lockouts (Security Center + login_history)  
4. Postgres connection / disk  
5. Queue / Kafka lag (if enabled)  
6. Container restart counts  

## Product UI

- Executive `/dashboard` for business risk framing  
- Security Center `/security` for access posture  
- Synthetics against own `/health` as canary  

## Gap (disclosed)

Pre-built Grafana JSON boards are not shipped as a full suite in this commercial pack; operators wire Prometheus/Grafana using the endpoints above. Expanding first-party dashboards is a **v1.1** candidate driven by pilot feedback — not a new product family.
