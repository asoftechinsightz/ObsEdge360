# OpsEdge360 — Phase 3 Implementation (Autonomy)

Phase 3 delivers **autonomous operations**: OT industrial connectors, fraud detection, self-healing remediation, sustainability intelligence, and SIEM integration.

## What's New

| Capability | Service | Port |
|------------|---------|------|
| Fraud & Anomaly Detection | `services/security` | 4006 |
| Self-Healing Remediation | `services/remediation` | 4007 |
| OT Connectors (OPC-UA, Modbus, MQTT) | `services/discovery` | 4001 |
| Sustainability Intelligence | `services/observability` | 4003 |
| SIEM Webhook Ingestion | `services/security` | 4006 |

## Quick Start

```powershell
npm run db:migrate
npm run dev
npm run dev:agents    # separate terminal
npm run phase3:bootstrap
```

## OT Industrial Discovery

Connectors (all **read-only** by default):
- **OPC-UA** — PLCs, SCADA, sensors
- **Modbus** — VFDs, meters, sensor arrays
- **MQTT** — IoT topics, smart building devices

OT Safety Zones enforce:
- Read-only polling
- Rate limits (0.5–2 Hz)
- OT engineer approval for production zones
- `ot_zone_safe` flag on remediation runbooks

## Fraud & Anomaly Detection

```http
POST /api/v1/security/analyze
{ "metrics": [{ "name": "payment.velocity.tps", "value": 540 }] }
```

- Adaptive baselines with σ-deviation detection
- Explainable fraud alerts with reason codes
- Auto-triggers fraud AI agent

## Self-Healing Remediation

```http
GET  /api/v1/remediation/runbooks
POST /api/v1/remediation/request
POST /api/v1/remediation/approvals/:id/execute
```

Runbooks:
- **Restart Payment API Pods** (medium risk, approval required)
- **Scale DB Connection Pool** (high risk)
- **Block Suspicious IP** (low risk, auto-execute)

Risk tiers: low → auto, medium/high → human approval.

## SIEM Integration

```http
POST /api/v1/security/siem/webhook
GET  /api/v1/security/siem/events
```

Ingests Splunk, Sentinel, or generic webhook events with automatic CMDB correlation.

## Sustainability

```http
GET /api/v1/sustainability/summary
GET /api/v1/sustainability/recommendations
```

Tracks energy, carbon, PUE, renewable %, idle resources with AI rightsizing recommendations.

## New UI Pages

- `/security` — fraud alerts, anomalies, posture score
- `/sustainability` — energy/carbon KPIs, recommendations
- `/ot` — safety zones, OT asset count

## Phase 4 Preview

See [PHASE4.md](PHASE4.md) — now implemented.
