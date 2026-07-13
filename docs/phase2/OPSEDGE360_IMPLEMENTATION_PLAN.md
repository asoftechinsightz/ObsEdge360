# OpsEdge360 — Implementation Plan (MVP Program)

**Document ID:** OE360-IMPL-P2-001  
**Phase:** 2  
**Assumption:** Phase 1 architecture accepted; no redesign unless critical defect.

**Effort key:** S ≤ 1w · M 1–2w · L 2–4w · XL &gt; 4w (team-week rough order)

---

## Program milestones

| Milestone | Outcome |
|-----------|---------|
| M0 | Contracts frozen (OpenAPI stubs + adapter SPI) |
| M1 | Journey A demoable on populated tenant |
| M2 | Security + AI + automation dry-run in journey |
| M3 | Reports + UI certification + acceptance PASS |
| M4 | Production hardening / on-prem profile notes |

Sprints below map to MVP; v1.1+ continues after acceptance.

---

## Sprint 1 — Executive Dashboard

| | |
|--|--|
| **Objectives** | Command Center widgets stable; single-fetch aggregator; action cards live |
| **Dependencies** | Gateway dashboard API; auth |
| **Acceptance** | Exec role lands on populated home; drill to service/incident works |
| **Risks** | Widget contract drift |
| **Effort** | M |

## Sprint 2 — Observability Integration

| | |
|--|--|
| **Objectives** | ObserveAdapter v1 (SkyWalking/OTel); metrics/logs/traces/topology façades |
| **Dependencies** | Adapter SPI; demo engine or recorded fixtures |
| **Acceptance** | Journey A steps Logs+Trace PASS without vendor UI |
| **Risks** | Engine auth/version mismatch |
| **Effort** | L |

## Sprint 3 — Digital Twin

| | |
|--|--|
| **Objectives** | Graph API non-empty; blast radius; business service overlay; EDE relationships |
| **Dependencies** | CMDB data; optional NetBox read |
| **Acceptance** | Twin nodes+edges &gt; 0; impact from payment service works |
| **Risks** | Empty edge sets (known RC1 class bug) |
| **Effort** | L |

## Sprint 4 — AI Copilot

| | |
|--|--|
| **Objectives** | Grounded summary/RCA assist; citations; no ungated execute |
| **Dependencies** | Tools registry; policy guard |
| **Acceptance** | Incident AI panel returns hypotheses with evidence refs |
| **Risks** | Hallucination; tenant leak |
| **Effort** | L |

## Sprint 5 — Security Center

| | |
|--|--|
| **Objectives** | SecurityAdapter (Wazuh); MITRE/evidence/timeline UX |
| **Dependencies** | Wazuh lab/demo; findings DTO |
| **Acceptance** | Journey B PASS |
| **Risks** | GPL packaging; agent lab complexity — use fixtures if needed for MVP demo |
| **Effort** | L |

## Sprint 6 — ITSM

| | |
|--|--|
| **Objectives** | Incident Workspace polish; optional GLPI sync spike; CMDB browser |
| **Dependencies** | Migration 049-class schema |
| **Acceptance** | Assign→investigate→verify→close-and-report |
| **Risks** | Over-scoping Problem/Change (keep 1.1) |
| **Effort** | M |

## Sprint 7 — Automation

| | |
|--|--|
| **Objectives** | WorkflowAdapter/RemediationAdapter dry-run + approval request |
| **Dependencies** | n8n and/or Ansible runner; SoD policies |
| **Acceptance** | Dry-run artifact on incident; audit row written |
| **Risks** | License (n8n); accidental prod execute |
| **Effort** | L |

## Sprint 8 — Reporting

| | |
|--|--|
| **Objectives** | Exec + incident + automation reports; export formats |
| **Dependencies** | Report service; templates |
| **Acceptance** | Journey A final step PASS with downloadable file |
| **Risks** | Template drift |
| **Effort** | M |

## Sprint 9 — Marketplace (shell only / prep)

| | |
|--|--|
| **Objectives** | Readiness design + stub catalog **or** defer UI to v2.0; document pack format |
| **Dependencies** | Plugin manifest |
| **Acceptance** | MVP: pack **content** (Banking) ships; install UX may be Admin-only seed |
| **Risks** | Scope creep — do not block MVP on full marketplace |
| **Effort** | S (MVP prep) / XL (v2.0) |

## Sprint 10 — Production Hardening

| | |
|--|--|
| **Objectives** | HA checks, connector health, backup/restore notes, security review, perf budgets |
| **Dependencies** | All MVP features |
| **Acceptance** | Executive checklist all Critical items PASS; deploy profiles documented |
| **Risks** | Env drift (nginx upstream sticky IPs — known ops note) |
| **Effort** | M |

---

## Cross-sprint backlog hygiene

- Every ticket tagged `MVP|1.1|2.0|3.0` + priority  
- No direct UI→engine calls (lint/arch test)  
- Demo data refresh job part of Definition of Done for Journey A  

---

## Team topology (suggested)

| Stream | Focus |
|--------|-------|
| Experience | Web shell, twin UI, workspaces |
| Platform | Gateway, authz, events |
| Adapters | SkyWalking, Wazuh, NetBox, GLPI, n8n, Ansible |
| AI | Copilot tools + safety |
| Demo/QA | EDE packs, journey evidence |
