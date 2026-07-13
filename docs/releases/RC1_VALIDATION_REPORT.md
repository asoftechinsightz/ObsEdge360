# Sprint 1 RC1 — Validation Report

**Document ID:** OE360-S1-RC1-VAL  
**Date:** 2026-07-13  
**Environment:** Production VPS `observability360.asoftechinsightz.com`  
**Build:** `e065f567ce8e0f566e523195cd70b535bfdde4c4`  
**Evidence:** `/tmp/opsedge360-s1-rc1-evidence` on VPS  

---

## Scope

Product validation of the **Executive Command Center** (Sprint 1) — not a code review.

---

## 1. Deployment Validation

| Check | Result | Evidence |
|-------|--------|----------|
| Git SHA on VPS | `e065f56` Sprint 1 commit | validate log |
| Docker api-gateway | Up (healthy) | containers.txt |
| Docker web | Up | containers.txt |
| Docker nginx | Recreated (upstream refresh) | deploy log |
| Health | **200** healthy, all core services up | health.json |
| Ready / Live | **200** | validate log |
| Web | **200** | validate log |
| TLS/HTTPS | Served via nginx 443 | external curl |
| DB connectivity | Demo enter + dashboard queries succeed | ede-enter / dashboard |
| Logging | Nest/gateway startup + nginx access | container logs |

**Deployment gate: PASS**

---

## 2. Functional Validation (Executive widgets)

| Widget / area | Result | Notes |
|---------------|--------|-------|
| Business Health | PASS | `health.business` first in order |
| Revenue Impact | PASS | `health.revenue` second; ₹120K/hr |
| Service Health table | PASS | 12 rows; twin impact hrefs |
| Critical / broken signals | PASS | `health.alerts` + 120 open alerts |
| Active incidents | PASS | 5 real UUIDs with workspace links |
| AI / narrative brief | PASS | what / why / impact / next present |
| Recommended actions | PASS | 11 actions; zero `#` hrefs |
| Search | PASS | HTTP 200 |
| Twin graph | PASS | 54 nodes / 59 edges |
| Navigation targets | PASS | incident + twin deep links |

Sample:

- `health_order=health.business,health.revenue,health.alerts,health.overall,health.availability`
- `incident0_href=/ops-intelligence?incident=59711f3e-...`
- `service0_href=/twin?workflow=impact&focus=...&name=ATM%20Switching`
- `totalAssets=3340` (EDE illustrative pack)

**Functional gate: PASS**

---

## 3. Executive Experience (30-second test)

| Persona question | Answered by dashboard? |
|------------------|------------------------|
| Is the business healthy? | Yes — Business Health + Overall |
| What is broken? | Yes — alerts / incidents strip |
| Business impact? | Yes — revenue at risk + narrative.impact |
| What should I do next? | Yes — narrative.next + action board |
| Current incidents? | Yes — 5 workspace-linked incidents |

**Executive review gate: PASS**

---

## 4. AI Validation

| Required element | Executive narrative | RCA API (sample incident) |
|------------------|---------------------|---------------------------|
| Summary | PASS (`what`) | PASS (`summary`) |
| Evidence | Via linked services/incidents | PASS (8 evidence items) |
| Confidence | `aiConfidence` present | **WARN** (`confidencePct=0`) |
| Business impact | PASS | Partial (in summary text) |
| Affected services | Via table / incidents | Partial |
| Root cause | Narrative `why` | **WARN** (0 hypotheses) |
| Remediation / automation | Action board + next | Partial (not structured in RCA payload) |

**AI gate: PASS for Sprint 1 executive brief · PARTIAL for full RCA Copilot (tracked → Sprint 4)**  
Severity: **Medium** residual (not Critical for Executive CC scope).

---

## 5. Digital Twin Validation

| Check | Result |
|-------|--------|
| Nodes / edges | 54 / 59 PASS |
| Service → twin drill | PASS |
| Impact workflow query | Supported (`focus`/`name`) |
| Health visualization | Via graph styling + scores |

**Twin gate (Sprint 1 dependency): PASS**

---

## 6–10. Other gates

See companion reports:

- Performance → `RC1_PERFORMANCE_REPORT.md` **PASS**
- Security → `RC1_SECURITY_REVIEW.md` **PASS**
- UI → `RC1_UI_REVIEW.md` **PASS** (with Medium residuals)
- Accessibility → **PARTIAL** (basics PASS; formal AA deferred — Medium)
- Customer Demo → `RC1_DEMO_REPORT.md` **PASS** (API journey)

---

## Defects

| ID | Severity | Description | Disposition |
|----|----------|-------------|-------------|
| S1-RC1-01 | Medium | RCA `confidencePct=0`, no hypotheses | Sprint 4 AI |
| S1-RC1-02 | Medium | Formal WCAG AA / light-theme screenshot pack incomplete | v1.1 / Sprint 10 |
| S1-RC1-03 | Low | `ops_incident_activity` count 0 on sample query | Monitor; workspace still 200 |

**Critical: 0 · High: 0**

---

## Decision

See [RC1_GO_NO_GO.md](./RC1_GO_NO_GO.md).
