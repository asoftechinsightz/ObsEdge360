# OpsEdge360 — Feature Prioritization

**Document ID:** OE360-PRI-P2-001  
**Phase:** 2  
**Method:** Prioritize by **customer demo / buy value**, not engineering complexity.

**Scale:** Critical · High · Medium · Low · Deferred

---

## Critical (MVP blockers for enterprise demo)

| Feature | Release | Rationale |
|---------|---------|-----------|
| Executive Command Center | MVP | First impression / CIO proof |
| Populated Digital Twin | MVP | Flagship; empty graph kills deal |
| Business Service health | MVP | Links tech to business |
| Incident Workspace E2E | MVP | Ops credibility |
| Observability drill-down | MVP | Expected vs Datadog/Dynatrace class |
| Security Workspace | MVP | Expands beyond “APM tool” |
| AI incident summary / RCA assist | MVP | Modern platform expectation |
| Close-and-report + exec report | MVP | Closes the story |
| Unified branding / single shell | MVP | Product principle |
| RBAC + tenant isolation | MVP | Enterprise table stakes |
| Realistic demo data pack | MVP | No empty dashboards |
| Adapter abstraction (no vendor UI) | MVP | Architecture compliance |

---

## High (immediately after / parallel harden)

| Feature | Release | Rationale |
|---------|---------|-----------|
| NetBox sync | 1.1 | Network SoT credibility |
| GLPI sync | 1.1 | ITSM/asset bridge |
| Notifications | 1.1 | Operational completeness |
| Theme + a11y certification | 1.1 | Fortune-500 UI bar |
| Problem/Change minimal | 1.1 | ITSM breadth signal |
| Automation approve→execute | 1.1 | Beyond dry-run |
| Extra industry demos | 1.1 | More vertical pitches |
| Connector health/upgrade docs | 1.1 | Enterprise ops readiness |
| Public API preview | 1.1→2.0 | Integration buyers |

---

## Medium

| Feature | Release | Rationale |
|---------|---------|-----------|
| Knowledge base | 1.1 | Nice for MTTR story |
| Report scheduling | 1.1 | Ops convenience |
| Capacity module | 2.0 | Expansion SKU |
| Cost module | 2.0 | FinOps narrative |
| Drift GA | 2.0 | Twin overlay depth |
| Synthetics foundations | 2.0 | Obs parity path |
| GraphQL twin | 2.0 | Scale queries |
| ServiceNow adapter | 2.0 | Coexistence deals |

---

## Low

| Feature | Release | Rationale |
|---------|---------|-----------|
| Mobile-native apps | 3.0 / Deferred | Responsive web first |
| Custom dashboard studio GA | 2.0→3.0 | After core journeys |
| Community plugin store | 3.0 | After signed marketplace |
| Advanced UEBA | Deferred | Rely on security engine depth |

---

## Deferred (explicitly not scheduled)

| Feature | Why deferred |
|---------|----------------|
| Fork/rebrand any OSS engine | Violates architecture |
| Full Splunk content parity | Not strategy |
| Full ServiceNow ITSM replacement | Partner/coexist instead |
| Ungated auto-remediation | Safety / trust |
| Docx export | P2 residual from RC1 |
| Quantum / speculative modules | Out of MVP narrative |

---

## Value scoring rubric (for new requests)

| Score | Criteria |
|-------|----------|
| 5 | Appears in CIO demo path or RFP must-have |
| 4 | Strengthens twin/security/automation story |
| 3 | Improves operator efficiency |
| 2 | Nice-to-have polish |
| 1 | Internal-only / speculative |

**Priority = customer value score**; complexity only sequences engineering after priority is set.
