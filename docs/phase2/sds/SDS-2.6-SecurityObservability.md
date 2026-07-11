# SDS-2.6 — Enterprise Security Observability

**Document ID:** OE360-SDS-2.6  
**Wave:** 6 — Security Observability  
**Release:** `v0.9.2`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (EAB 2026-07-11)  
**Depends on:** Waves 1–5 closed · Security Baseline · Audit dual-layer · Secrets · Service identity  

---

## 1. Objectives

Unify visibility into OpsEdge360 security posture: ingest security telemetry from AuthN/AuthZ, secrets, service identity, certificates, and audit streams; correlate by `traceId` / `correlationId`; expose dashboards, detection rules, risk signals, and alerts — with multi-tenant isolation preserved.

## 2. Scope

### In (Wave 6)

| Area | Deliverable |
|------|-------------|
| Event ingestion | `security_events` store + ingest API |
| Telemetry sources | AuthZ metrics, audit denies, secret access, service token mint, cert events |
| Correlation | Store/query by correlationId + traceId |
| Dashboards API | Summary KPIs (denies, cross-tenant, secret access, service auth) |
| Detection rules | Configurable rules table + evaluator |
| Risk scoring | Simple weighted score per tenant (0–100) |
| Alerting | `security_alerts` + list/ack APIs (notification hooks stub) |
| Metrics export | Prometheus text includes `security.*` counters |
| OTEL alignment | Event schema carries trace/correlation; optional OTLP JSON ingest stub |
| Tenant isolation | All reads filtered by tenant UUID |

### Out / later (Wave 7+)

- Full UEBA / ML anomaly  
- SIEM connectors productization  
- mTLS mesh observability  
- Executive GRC UI polish  

## 3. Architecture

```text
AuthZ / Audit / Secrets / Trust emitters
        │
        ▼
 Security Event Ingest (gateway)
        │
        ├──► security_events (tenant-scoped)
        ├──► detection evaluator → security_alerts
        └──► Prometheus /security metrics scrape
        │
        ▼
 Security Observability APIs (dashboard, search, rules, alerts)
```

## 4. Data model (migration 020)

### `security_events`
id, tenant_id, event_type, category, severity, source_service, actor_id, resource_type, resource_id, correlation_id, trace_id, risk_score, payload JSONB, created_at  

### `security_detection_rules`
id, tenant_id (null=global), name, enabled, rule_type, config JSONB, severity, created_at  

### `security_alerts`
id, tenant_id, rule_id, title, severity, status (`open`\|`acked`\|`closed`), event_ids[], summary, created_at, acked_at  

## 5. APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/security-observability/events` | Ingest event |
| GET | `/api/v1/security-observability/events` | Search |
| GET | `/api/v1/security-observability/dashboard` | KPI summary |
| GET/POST | `/api/v1/security-observability/rules` | Detection rules |
| GET | `/api/v1/security-observability/alerts` | List alerts |
| POST | `/api/v1/security-observability/alerts/:id/ack` | Acknowledge |
| GET | `/api/v1/security-observability/health` | Pipeline health |
| GET | `/api/v1/metrics` | Includes security counters (existing) |

Permissions: `security:read` / `security:write` (existing registry).

## 6. Built-in detection rules (defaults)

| Rule | Trigger |
|------|---------|
| `cross_tenant_spike` | ≥ N cross-tenant attempts in window |
| `authz_deny_spike` | ≥ N authz denies in window |
| `secret_access_burst` | ≥ N secret.accessed in window |

## 7. Acceptance criteria

1. Ingest + search tenant-scoped  
2. Dashboard returns KPIs from events/metrics  
3. At least 3 default rules seedable  
4. Alert created when rule fires (evaluator on ingest or interval)  
5. Prometheus metrics include security.*  
6. Cross-tenant read denied  
7. Migration 020 · OpenAPI · tests · VPS validation  
8. No regression of Waves 1–5 controls  

## 8. Rollback

`SECURITY_OBS_ENABLED=false`; stop ingest/evaluator; redeploy prior tag.
