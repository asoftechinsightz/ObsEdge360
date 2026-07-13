# Sprint 1 RC1 — Customer Demo Report

**Document ID:** OE360-S1-RC1-DEMO  
**Date:** 2026-07-13  
**Build:** `e065f56`  
**Pack:** Asoftech Global Bank (EDE) illustrative

---

## Demo flow execution

| Step | Path | Result |
|------|------|--------|
| 1 Executive Dashboard | `GET /dashboard/executive?role=cio` | **PASS** — populated |
| 2 Business Service | Service table → Twin impact href | **PASS** |
| 3 Incident | Real incident UUID → workspace **200** | **PASS** |
| 4 Digital Twin | 54 nodes / 59 edges | **PASS** |
| 5 Logs | Via Observability module (Sprint 2 depth) | **PASS*** navigate available |
| 6 Trace | Via Observability / APM routes | **PASS*** navigate available |
| 7 AI Analysis | RCA summary + 8 evidence items | **PASS** (confidence residual) |
| 8 Automation | Action → `/admin/workflows?workflow=run` | **PASS** link |
| 9 Executive Report | `GET /reports` **200** | **PASS** |

\*Full log/trace explorer depth is Sprint 2; Journey A uninterrupted navigation from Executive CC is validated.

---

## Interruption check

No blocking errors on authenticated Journey A API chain. Demo tenant must keep EDE loaded (`totalAssets=3340`).

---

## Talk track (30 seconds)

1. Business health and revenue at risk  
2. What is broken (alerts/incidents)  
3. Open incident workspace  
4. Twin blast from ATM/Payments path  
5. AI summary with evidence  
6. Recommended action / report  

---

## Customer Demo gate: PASS
