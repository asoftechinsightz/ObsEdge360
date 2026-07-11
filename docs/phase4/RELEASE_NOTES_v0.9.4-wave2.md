# Release Notes — v0.9.4-wave2

**Phase 4 Wave 2 — Advanced multi-signal correlation**

## Highlights

- Correlate metrics, logs, traces, alerts, anomalies, and config/drift changes into scored clusters
- Persist correlation members and signal snapshots (migration 029)
- New APIs under `/api/v1/ai/signals/*` and correlation detail
- AIOps UI supports collect → correlate → inspect members

## Ops

- Tag: `v0.9.4-wave2`
- Validation token: `P4_WAVE2_VALIDATION_OK`
- Backward compatible: `POST /ai/correlate` upgraded in place
