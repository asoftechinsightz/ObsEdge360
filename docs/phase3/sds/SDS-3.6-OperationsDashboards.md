# SDS-3.6 — Operations Dashboards

**Document ID:** OE360-SDS-3.6  
**Wave:** Phase 3 / Wave 6  
**Release:** `v0.9.3`  
**Status:** ✅ CLOSED — production validated (`v0.9.3-wave6`)  
**Depends on:** Wave 5 closed (`v0.9.3-wave5`)

## Objectives

Thin **tenant-scoped NOC dashboards** foundation:

1. Dashboard CRUD with refresh interval and visibility  
2. Widget catalog (KPI, timeseries, incidents, anomalies, topology, SLO, signals, forecasts)  
3. Layout persistence (grid x/y/w/h)  
4. Server-side widget data resolve composing Waves 1–5 APIs  
5. Optional role/user shares (view/edit)  
6. Thin studio UI `/dashboards` + `/dashboards/[id]`  

## Non-goals

- Full ADR-019 Dashboard Studio / pack SDK (v0.9.5)  
- Replacing Grafana  
- Breaking fixed pages (`/dashboard`, `/observability`, `/ops-intelligence`)  

## Migration

**027** — `ops_dashboards`, `ops_dashboard_widgets`, `ops_dashboard_shares`

## Acceptance

**P3_WAVE6_VALIDATION_OK** in production.
