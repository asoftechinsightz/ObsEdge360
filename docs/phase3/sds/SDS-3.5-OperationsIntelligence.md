# SDS-3.5 — Operations Intelligence

**Document ID:** OE360-SDS-3.5  
**Wave:** Phase 3 / Wave 5  
**Release:** `v0.9.3`  
**Status:** ✅ APPROVED FOR IMPLEMENTATION (EAB after Wave 4)  
**Depends on:** Wave 4 closed (`v0.9.3-wave4`)

## Objectives

Evidence-backed Operations Intelligence foundations (deterministic — **not** Phase 4 LLM):

1. **Incident correlation** — cluster alert events + anomalies within a time window; link CIs via name/topology  
2. **RCA sessions** — persist evidence gather + ranked hypotheses with confidence; insufficient-signal when empty  
3. **Anomaly scan hooks** — rolling baselines from `prometheus_samples` / OTLP metrics → `anomalies` + `metric_baselines`  
4. **Predictive signals (lite)** — linear trend forecasts from real sample windows (`model_version: trend-v1`)  
5. **Remediation dry-run** — request/list/execute with `executionMode: dry_run` and audit trail  
6. **Ops Intelligence APIs + thin UI** under `/api/v1/ops-intelligence/*` and `/ops-intelligence`

## Non-goals

- LLM / RAG / autonomous remediation (Phase 4+)  
- Full NOC dashboard studio (Wave 3.6)  
- Breaking existing `/copilot`, `/security`, `/remediation`, `/analytics` routes  

## Migration

**026** — `ops_incidents`, `ops_incident_members`, `ops_incident_ci_links`, `rca_sessions`, `rca_hypotheses`, `metric_baselines`, `ops_intelligence_signals`, `ops_remediation_requests`

## Acceptance

**P3_WAVE5_VALIDATION_OK** in production.
