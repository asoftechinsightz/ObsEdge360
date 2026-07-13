# OpsEdge360 — Customer Journey Validation

**Document ID:** OE360-JRN-P2-001  
**Phase:** 2  
**Rule:** Every enterprise workflow must feel seamless inside **one** product.

---

## Journey A — Executive to Resolution (primary demo)

```text
Executive Dashboard
  → Business Service
  → Health Score
  → Incident
  → Topology / Twin
  → Logs
  → Trace
  → AI Analysis
  → Automation (dry-run / approve)
  → Resolution / Verify
  → Executive Report
```

| Step | Screen | Success criteria | Status design |
|------|--------|------------------|---------------|
| 1 | Executive Home | KPIs + action card in &lt; 5s | Must PASS MVP |
| 2 | Business Service | Service SLO/health visible | Must PASS |
| 3 | Health Score | Drill explains contributors | Must PASS |
| 4 | Incident Workspace | Lifecycle + impact | Must PASS |
| 5 | Twin / Topology | Related nodes+edges non-empty | Must PASS |
| 6 | Logs | Filtered to service/time | Must PASS |
| 7 | Trace | Waterfall or trace list | Must PASS |
| 8 | AI Analysis | Summary + hypotheses + citations | Must PASS |
| 9 | Automation | Dry-run result shown | Must PASS |
| 10 | Resolve | Verify + close | Must PASS |
| 11 | Report | Exportable exec/incident report | Must PASS |

**Seamlessness checks:** one auth session; deep links; no vendor UI; breadcrumbs coherent; search can re-enter mid-journey.

---

## Journey B — Security threat to business impact

```text
Security Workspace → Finding → MITRE/Evidence → Related Assets → Twin Blast
  → Incident → AI Summary → Automation proposal → Report
```

| Gate | Criteria |
|------|----------|
| Finding context | Evidence + timeline present |
| Business impact | Twin shows affected BusinessService |
| Handoff | One click to Incident Workspace |

---

## Journey C — Change-aware incident

```text
Alert → Correlate → Detect recent Change/Deploy → Twin path → RCA → KB suggest
```

MVP: deploy/change marker if available; full Change module in 1.1.

---

## Journey D — Operator triage (NOC)

```text
Operations Center → Alert stream → Acknowledge → Create/Join Incident → Twin → Observe
```

---

## Journey E — Admin connector trust

```text
Admin → Connectors → Test health → View last sync → No secrets exposed → Audit entry
```

---

## Journey F — Executive read-only pack

```text
Login as executive → Home → Twin executive view → Reports → Copilot question (read tools only)
```

Must not show admin connector internals.

---

## Validation method

1. Scripted click-path on demo tenant  
2. Capture screenshots + API evidence  
3. Score each step PASS/FAIL  
4. Any FAIL on Journey A blocks “Enterprise MVP” claim  

Checklist artifact: [OPSEDGE360_EXECUTIVE_ACCEPTANCE_CHECKLIST.md](./OPSEDGE360_EXECUTIVE_ACCEPTANCE_CHECKLIST.md)
