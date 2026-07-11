# SDS-3.1 — Telemetry Platform

**Document ID:** OE360-SDS-3.1  
**Wave:** Phase 3 / Wave 1 — Telemetry Platform  
**Release:** `v0.9.3`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (EAB 2026-07-11)  
**Depends on:** Phase 2 closed (`v0.9.2-wave7`)

---

## 1. Objectives

Establish a production-grade **unified telemetry ingestion platform** for metrics, logs, and traces — with OpenTelemetry Collector compatibility, streaming ingest health, data quality validation, collector fleet registry, and retention controls — building on the existing OTLP JSON + Prometheus paths without breaking APIs.

## 2. Scope

### In (Wave 1)

| Capability | Deliverable |
|------------|-------------|
| OTLP metrics/logs/traces | Hardened ingest + quality validation |
| Collector fleet | Registry + heartbeat for OTel collectors |
| Streaming ingest visibility | Ingest stats + platform health APIs |
| Data quality | Schema/required-field checks; quality event log |
| Retention | Configurable retention policies (apply job stub + API) |
| OTel Collector config | Reference config exporting to OpsEdge360 |
| Optional collector service | Compose profile for collector sidecar/fleet |
| Migration | **022** |

### Out / later waves

| Item | Wave |
|------|------|
| Full Universal Agent shipper | 3.2 |
| Discovery depth | 3.3 |
| Live topology from traces | 3.4 |
| Correlation / RCA / AIOps | 3.5 |
| NOC/SOC dashboard studio | 3.6 |
| Replace Postgres with dedicated TSDB | Follow-on (design-compatible) |

## 3. Architecture

```text
Agents / Apps / Cloud
        │
        ▼
 OpenTelemetry Collector (fleet)
        │  OTLP HTTP/JSON (+ Prom remote_write)
        ▼
 Observability Service
   ├─ Quality gate
   ├─ Rate limit (existing)
   ├─ Persist (otlp_* / prometheus_samples)
   ├─ Ingest stats + quality events
   └─ Kafka TELEMETRY_RECEIVED (existing)
        │
        ▼
 Gateway /api/v1/observability/*
```

## 4. Data model (migration 022)

### `telemetry_collectors`
id, tenant_id, name, collector_type, endpoint, status, last_heartbeat_at, version, metadata, created_at

### `telemetry_ingest_stats`
id, tenant_id, signal (`metrics`\|`logs`\|`traces`), window_start, accepted, rejected, bytes_in, created_at  
Unique (tenant_id, signal, window_start)

### `telemetry_quality_events`
id, tenant_id, signal, reason, sample, created_at

### `telemetry_retention_policies`
id, tenant_id (null = global), signal, retention_days, enabled, created_at

## 5. APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/observability/telemetry/health` | Platform health KPIs |
| GET/POST | `/api/v1/observability/telemetry/collectors` | List / register collector |
| POST | `/api/v1/observability/telemetry/collectors/:id/heartbeat` | Heartbeat |
| GET | `/api/v1/observability/telemetry/stats` | Ingest stats |
| GET | `/api/v1/observability/telemetry/quality` | Recent quality events |
| GET/POST | `/api/v1/observability/telemetry/retention` | Retention policies |
| POST | `/api/v1/observability/telemetry/retention/apply` | Apply retention (delete aged) |

Existing OTLP routes unchanged: `POST .../otlp/{metrics,logs,traces}`.

## 6. Acceptance criteria

1. Migration 022 applied  
2. Collector register + heartbeat works  
3. OTLP ingest records stats; invalid payloads create quality events  
4. Telemetry health returns KPIs  
5. Retention policy CRUD + apply reduces aged rows  
6. Reference OTel collector config present  
7. Tenant isolation on telemetry APIs  
8. Production validation script green  

## 7. Rollback

| Flag | Effect |
|------|--------|
| `TELEMETRY_QUALITY_GATE=false` | Skip quality rejects (log only) |
| `TELEMETRY_STATS=false` | Skip stats writes |
| Disable collector compose profile | No fleet sidecar |
