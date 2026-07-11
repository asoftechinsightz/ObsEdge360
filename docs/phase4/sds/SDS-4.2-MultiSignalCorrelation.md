# SDS-4.2 — Advanced Multi-Signal Correlation

**Document ID:** OE360-SDS-4.2  
**Wave:** Phase 4 / Wave 2  
**Release:** `v0.9.4`  
**Status:** ✅ CLOSED (`v0.9.4-wave2`)  
**Depends on:** Wave 1 closed (`v0.9.4-wave1`)

## Objectives

Correlate operational signals across:

1. **Metrics** — prometheus samples / anomalies  
2. **Logs** — OTLP error/warn bursts  
3. **Traces** — span error rates / latency outliers  
4. **Alerts** — alert_events  
5. **Changes** — configuration_history / drift_events (when present)  

Produce scored correlation clusters with member provenance, CI affinity, and optional link to ops incidents / LLM RCA.

## Non-goals

- Predictive forecasting (Wave 4.3)  
- Controlled live remediation (Wave 4.4)  
- Full knowledge graph (Wave 4.5)  

## Migration

**029** — `aiops_signal_snapshots`, `aiops_correlation_members`; extend `aiops_correlation_events`.

## Acceptance

**P4_WAVE2_VALIDATION_OK** in production.
