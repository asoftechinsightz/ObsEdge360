# Release Notes — v0.9.3-wave5

**Production SHA:** `30e0d40a6a63556b16fb4cea7bd150dafdc64664`  
**Date:** 2026-07-11

Operations Intelligence foundations: alert/anomaly correlation into incidents, evidence-based RCA (no LLM), rolling metric baselines and anomaly scan, linear trend forecasts (`trend-v1`), dry-run remediation with audit signals, Ops Intelligence UI, migration **026**. Validated (`P3_WAVE5_VALIDATION_OK`, 16/16).

## Known limitations

- Remediation execute is **dry-run only** — live mutation deferred  
- Forecasts require sufficient prometheus/OTLP samples; empty windows yield zero forecasts (valid)  
- LLM/RAG RCA is Phase 4 — Wave 5 hypotheses are deterministic evidence rankings
