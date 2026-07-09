# OpsEdge360 — Phase 2 Implementation

Phase 2 adds **intelligence layer**: business transaction mapping, compliance validation engine, network observability, and AI agent integration.

## What's New

| Capability | Service | Port |
|------------|---------|------|
| Business Transaction Discovery | `services/transactions` | 4005 |
| Compliance Validation Engine | `services/compliance` | 4004 |
| NetFlow / SNMP Network Obs | `services/observability` | 4003 |
| AI Agents (DB + events) | `ai-agents` | 5000 |
| SNMP Discovery Connector | `services/discovery` | 4001 |

## Quick Start

```powershell
# After Phase 1 setup
npm run db:migrate          # applies 003_phase2.sql + seeds
npm run dev                 # now includes transactions + compliance

# Second terminal
npm run phase2:bootstrap
```

Start AI agents separately:
```powershell
cd ai-agents
pip install -r requirements.txt
uvicorn src.main:app --reload --port 5000
```

## Key APIs

### Business Transactions
```http
GET  /api/v1/transactions
GET  /api/v1/transactions/by-classification/upi_payment
POST /api/v1/transactions/discover    # classify trace → map steps → link CIs
GET  /api/v1/transactions/templates   # BFSI, healthcare, retail templates
```

### Compliance Engine
```http
GET  /api/v1/compliance/frameworks    # live scores from validation
GET  /api/v1/compliance/controls?framework=ISO27001
POST /api/v1/compliance/validate      # run all controls against live CMDB
```

Controls validate against PostgreSQL CMDB:
- **A.8.1** — Asset inventory exists
- **A.8.2** — All CIs have owners
- **A.10.1** — Databases encrypted at rest
- **A.12.4** — API health scores above 70

Scheduled validation runs every 5 minutes.

### Network Observability
```http
GET  /api/v1/network/flows
GET  /api/v1/network/summary
POST /api/v1/network/flows            # NetFlow/IPFIX ingestion
POST /api/v1/network/snmp/metrics     # SNMP interface metrics
```

### AI Agents
```http
GET  /api/v1/agents/runs              # from PostgreSQL
POST /api/v1/agents/run               # trigger agent
POST /api/v1/agents/trigger/event     # event-driven (asset.discovered, compliance.violation)
```

Agents auto-trigger on `asset.discovered` when CMDB ingests new assets.

## Transaction Templates

Pre-built industry templates:
- BFSI: UPI, NEFT, RTGS, IMPS, Login
- Healthcare: Insurance Claims
- Retail: Checkout
- Manufacturing: Production Batch

## Architecture

```
Discovery (SNMP) → CMDB → Compliance Engine
OTLP Traces → Transaction Classifier → Step Mapping → CI Links
Compliance Violation → Kafka → AI Compliance Agent
Asset Discovered → AI Discovery Agent
NetFlow → network_flows table → Network Dashboard
```

## Phase 3 Preview

- OT protocol connectors (OPC-UA, Modbus)
- Fraud & anomaly ML models
- Self-healing remediation workflows
- SIEM/SOAR integrations
