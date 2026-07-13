# RC3 Executive Demo Report — Twin BSI Journey

**Date:** 2026-07-13  
**Production SHA:** `f5c706c72fd3601a043d528b544c31c976a133f1`  
**Demo tenant:** Asoftech Global Bank (EDE)  
**Primary service:** Payment Gateway (`40612fc6-2fe6-498e-bbb8-38098b9f6765`)

## Verdict: **PASS** (9/9 journey steps)

## Workflow executed (inside OpsEdge360 only)

| Step | Surface | Result |
|------|---------|--------|
| 1 | Executive Dashboard | **PASS** |
| 2 | Business Services | **PASS** (25 services) |
| 3 | Digital Twin graph | **PASS** (49 nodes focused) |
| 4 | Blast Radius | **PASS** (P3 · ₹15,600/hr) |
| 5 | Observability | **PASS** (OpsEdge360 brand) |
| 6 | Twin AI Analysis | **PASS** (confidence 0.82) |
| 7 | Incident linkage | **PASS** (12 items) |
| 8 | Executive Risk | **PASS** (score 89 · degraded) |
| 9 | Executive Report UI | **PASS** (`/reports`) |

Raw: `docs/releases/rc3-evidence/demo-journey.json`

## Twin AI sample (production)

> Twin analysis for Payment Gateway: healthy with 48 CIs in blast radius. Restore order starts with foundational data/platform dependencies.

Evidence types: `business_service`, `ownership`, `blast_radius`, `application`  
Business impact: `₹15600/hr · Retail + merchant payment corridors`  
Recovery order starts with Payment Gateway Hub → Enterprise API Gateway → applications.

## Screenshot evidence

| Capture | File |
|---------|------|
| Executive Home | `rc3-evidence/screenshots/executive-home.png` |
| Digital Twin | `rc3-evidence/screenshots/digital-twin.png` |
| Twin + service / blast | `rc3-evidence/screenshots/digital-twin-service.png` |
| Observability | `rc3-evidence/screenshots/observability.png` |
| Ops Intelligence | `rc3-evidence/screenshots/ops-intelligence.png` |
| Executive Reports | `rc3-evidence/screenshots/executive-reports.png` |

Vendor leaks in captures: **0**
