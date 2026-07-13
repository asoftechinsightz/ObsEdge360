# Phase 3 — Interaction Audit

**Date:** 2026-07-13  
**Scope:** `apps/web`, `apps/api-gateway`  
**Mandate:** No new product features until every existing interaction is production-backed, role-aware, and workflow-connected.  
**Verdict:** **P0 functional wiring in progress** — dead `#` hrefs removed; enterprise search, report export, agent approve/reject, security findings, and workflow deep-links landed. See [P0_FUNCTIONAL_STATUS.md](./P0_FUNCTIONAL_STATUS.md).

---

## Executive summary

Wave 1–2 delivered a real aggregated Executive Dashboard. Phase 3 execution rejects cosmetic relabeling. Every visible action must **execute a workflow**, **open a functional workspace**, or **be hidden**.

Status after P0 pass: primary fake interactions are wired or suppressed. Remaining work is **end-to-end lifecycle depth** (P1), not button honesty.

---

## 1. Navigation inventory

**Source:** `apps/web/src/lib/nav-config.ts` → `DashboardShell.tsx`

| Section | Item | Route | Page |
|---------|------|-------|------|
| Home | Executive Home | `/dashboard` | Yes |
| Estate | Discovery | `/discovery` | Yes |
| Estate | CMDB | `/cmdb` | Yes |
| Estate | CMDB Drift | `/cmdb/drift` | Yes |
| Estate | Digital Twin | `/twin` | Yes |
| Estate | Topology | `/topology` | Yes |
| Observe | Ops Intelligence | `/ops-intelligence` | Yes |
| Observe | Observability | `/observability` | Yes |
| Observe | APM | `/apm` | Yes |
| Observe | Synthetics | `/synthetics` | Yes |
| Observe | Network | `/network` | Yes |
| Observe | Transactions | `/transactions` | Yes |
| Assure | Security | `/security` | Yes |
| Assure | Compliance | `/compliance` | Yes |
| Assure | Banking360 | `/banking360` | Yes (flag) |
| Assure | ITSM | `/itsm` | Yes |
| Assure | AIOps / RCA | `/aiops` | Yes |
| Reports | Executive Reports | `/reports` | Yes |
| Reports | Guided Evaluation | `/demo/guided` | Yes |
| Admin | Enterprise Admin | `/admin` | Yes |
| Admin | Preferences / SSO / Help / About | various | Yes |

**Nav → page coverage:** Pass. No orphan primary nav hrefs.

---

## 2. Placeholder / dead-pattern scan

| Pattern | Result |
|---------|--------|
| Coming Soon / under construction | No matches in `apps/web/src` |
| `console.log` click handlers | None |
| TODO / FIXME in web src | None |
| `href="#"` fallback | Domain widgets when drilldown missing (`WidgetViews.tsx`) |
| Unwired buttons | Agents Approve/Reject — no `onClick` |
| Demo-empty states | Intentional EDE gating — feel “broken” without demo pack |

---

## 3. Dashboard interaction matrix

| Control | Destination / workflow | Status |
|---------|------------------------|--------|
| Health KPIs | Drilldown href from gateway | Pass when present |
| Domain cards | Workspace routes | Pass; `#` if drilldown missing |
| Top risks / AI recs / incidents | Linked routes | Pass |
| Security / Compliance insights | `/security`, `/compliance` | Pass (nav) |
| Affected services table | — | Fail — display only |
| Charts | — | Fail — no drilldown |
| Priority: Open incident | `/itsm` | Fail — navigate only |
| Priority: Run automation | `/aiops` | Fail — navigate only |
| Priority: Investigate topology/twin/drift | Routes | Pass (nav) |
| Inline AI brief | `POST /copilot/chat` | Pass |

---

## 4. Domain workspace status

| Workspace | API-backed | Workflow complete? |
|-----------|------------|--------------------|
| CMDB | Live CRUD | Partial — needs row context → twin/topology |
| Discovery | Live | Partial |
| Topology | Live | Partial — overlays incomplete vs Phase 3 target |
| Digital Twin | Live graph/impact | Partial — simulation / blast radius incomplete |
| Observability | Live | Partial |
| Security | Live identity APIs | **Fail vs expectation** — posture/fraud/SIEM APIs orphaned |
| Compliance | Live read | Partial — packs enable/disable unused |
| ITSM | Live list/create | Partial — CAB decide unused |
| Network | Live read | Weak — no flow drilldown |
| Transactions | Live | Partial |
| Reports | Generate live | **Fail** — export API unused |
| Banking360 | Live | Partial |
| AIOps / Ops Intelligence | Live | Partial — not end-to-end resolve/verify |
| Agents (debug) | APIs exist | **Fail** — Approve/Reject unwired |

---

## 5. API surface vs UI gaps

| Capability | Backend | UI |
|------------|---------|-----|
| Global search | No `/search` | Cmd+K nav only |
| Security posture / SIEM / fraud | `security.controller.ts` | Not called |
| Report export | `GET /reports/:id/export` | Not wired |
| ITSM CAB decide | `POST /itsm/cab/:id/decide` | Not wired |
| Agent approve/reject | `agents.controller.ts` | Buttons dead |
| Automation workflows | `/admin/automation/*` | Primary CTA never lands here |
| Notification mark-read | API exists | Not called on open |

---

## 6. Global search / Cmd+K

- **Exists:** `CommandPalette.tsx` + Ctrl/Cmd+K
- **Behaviour:** Filter `flattenNav()` → `router.push`
- **Product gap:** Header copy promises “Search estate, incidents, services…” — **blocker** until implemented or relabelled honestly

---

## 7. Top 20 remediation backlog (priority)

| # | Interaction | Severity | Required fix |
|---|-------------|----------|--------------|
| 1 | Header universal search | P0 | Relabel to “Jump to page” **or** build real search API + index |
| 2 | Agents Approve/Reject | P0 | Wire to API **or** remove buttons |
| 3 | Reports export (PDF/CSV) | P0 | Wire `GET /reports/:id/export` **or** remove export claims |
| 4 | Quick Action “Generate executive report” | P0 | Call generate API **or** honest label “Open reports” |
| 5 | Dashboard “Open incident” | P0 | Create/open incident workflow **or** relabel |
| 6 | Dashboard “Run automation” | P0 | Start runbook/workflow **or** deep-link automation + relabel |
| 7 | Security Center vs findings | P0 | Surface posture/SIEM **or** rename to Identity & Access |
| 8 | ITSM CAB decide | P1 | Wire decide UI |
| 9 | Domain card `href='#'` | P1 | Never emit `#`; hide card if no drilldown |
| 10 | Affected services row click | P1 | Deep-link service → CMDB/topology |
| 11 | Chart drilldown | P1 | Link to filtered workspace |
| 12 | Reports self-link CTA | P1 | Point to generate/export action |
| 13 | Notifications mark-read | P1 | Call read API on open |
| 14 | Compliance pack actions | P1 | Enable/disable + audit |
| 15 | Sustainability Apply | P2 | Act CTA or remove |
| 16 | Marketplace install | P2 | Install flow or browse-only labelling |
| 17 | Network flow drilldown | P1 | Row → detail / troubleshooting |
| 18 | Security alert triage | P1 | Investigate → incident create |
| 19 | Automation entry from dashboard | P1 | Route to `/admin/workflows` (or equivalent) with intent |
| 20 | Demo-empty friction | P1 | Clear empty-state + load demo / connect data CTAs |

---

## 8. Validation checklist (Phase 3 gate)

Current status against the product mandate:

| Criterion | Status |
|-----------|--------|
| Every menu works | Pass (routes resolve) |
| Every button works | Fail (agents, overpromised CTAs) |
| Every View Details / View All | Partial |
| Every table row opens | Fail (many display-only) |
| Every KPI drills down | Mostly (dashboard); charts fail |
| Every recommendation performs an action | Partial (navigate) |
| Every workflow reaches completion | Fail |
| No placeholder pages | Pass |
| No dummy buttons | Fail |
| No dead routes | Pass (primary nav) |
| All APIs production-backed for claimed UI | Fail (orphaned APIs) |
| Role permissions enforced | Partial — Wave 3 platform config deferred |
| Audit logs generated | Partial — not proven per interaction |
| Error handling / loading / telemetry | Partial |
| Production build passes | Pass (Wave 2.5 deployed) |

---

## 9. Recommended delivery sequence

Per mandate: **fix interactions before new features.** Do **not** start Wave 3 platform config APIs or net-new modules until P0 is green.

### Sprint A — Honesty & wiring (P0)

1. Relabel or implement global search  
2. Wire or remove: report export, agent approvals, CAB decide  
3. Convert or relabel dashboard/QuickAction CTAs (incident, report, automation)  
4. Align Security page IA with available APIs (posture vs identity)  
5. Ban `href='#'` widget fallbacks  

### Sprint B — Observe → Investigate → Resolve

1. Table row deep-links (services, alerts, incidents, network flows)  
2. Connect Ops Intelligence → Twin → Topology → CMDB → RCA → remediation  
3. Notification mark-read + telemetry on workflow steps  

### Sprint C — Workspace completeness

1. Enterprise table behaviours (sort/filter/export) where lists already exist  
2. Digital Twin / Topology overlays that are API-feasible  
3. Executive report generate → export → download  

### Sprint D — Platform config (former Wave 3)

Only after Interaction Audit P0/P1 green: `/platform/navigation`, tenant-config, features.

---

## 10. Decision required

| Option | Meaning |
|--------|---------|
| **A — Audit accepted** | Proceed with Sprint A P0 fixes only |
| **B — Relabel-first** | Fast honesty pass (copy + remove dead buttons), then wire workflows |
| **C — Search-first** | Implement real global search before other P0 |

**Engineering recommendation:** **B then A** — stop overpromising this week, wire highest-ROI APIs next, defer net-new feature surface until checklist P0 is green.

---

## References

- [WAVE25_REVIEW_PACKET.md](../cvp/WAVE25_REVIEW_PACKET.md)
- [ENTERPRISE_UX_REVIEW.md](../design-system/ENTERPRISE_UX_REVIEW.md)
- [RECOMMENDATIONS_BEFORE_WAVE_3.md](../design-system/RECOMMENDATIONS_BEFORE_WAVE_3.md)
