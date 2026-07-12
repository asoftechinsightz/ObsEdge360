# 02 — Navigation Review

**Source of truth:** `apps/web/src/components/DashboardShell.tsx`, `CommandPalette.tsx`, `Breadcrumbs.tsx`, `admin/AdminNav.tsx`

---

## Current structure

### Primary sidebar (flat)

~38 peer items. Order today mixes commercial/readiness with operations:

1. Executive Home, Executive Reports, Evaluation Tours  
2. Security Center, Pilot Package, RC2, RC3, License & Trial, RC1, About  
3. Discovery → … → AI Agents / SSO  

**Issues**

| Issue | Impact |
|-------|--------|
| No visual groups / sections | CIO and NOC see the same undifferentiated list |
| RC1/RC2/RC3 + Pilot in daily nav | Looks like an internal engineering portal |
| Duplicate Security entries | Same href twice; palette also duplicates |
| Banking360 inserted mid-list by env flag | Inconsistent mental model |
| Admin deep links only via AdminNav chips or URL | Discoverability gaps |
| Hard-coded `v1.0.0` footer | Fine; keep out of content panes |

### Command palette

- Strength: `Ctrl/Cmd+K` exists.  
- Weakness: ~26 routes; missing most product + admin depth; duplicate Security; default shows first 8 only.

### Breadcrumbs

- Pattern: Home → segments.  
- Label map covers only a handful of routes; others render `ops-intelligence`, `cmdb`, etc.  
- No section parent (e.g. Operations › Ops Intelligence).

### Favorites / Recents / Quick Actions

- **Not implemented** (star on Ops Dashboards is dashboard-default only).  
- No global Quick Actions strip (Create incident, Run synthetic, Open Copilot beyond header).

### Keyboard

- Palette: Ctrl/Cmd+K, Escape.  
- No documented skip-link, sidebar arrow nav, or focus trap audit.

---

## Target information architecture (recommended)

Keep all destinations; **regroup and progressive-disclose**.

```
★ Favorites / Recents (new chrome, not new modules)

Executive
  · Executive Home
  · Executive Reports
  · Evaluation Tours          (evaluators; demote after pilot)

Operations
  · Ops Intelligence          (default for NOC/SRE)
  · Ops Dashboards
  · Incidents (alias/deep-link into Ops Intelligence until route exists)
  · AIOps / RCA
  · Synthetics
  · Observability
  · APM (incl. Service Map)
  · Network · OT · Fleet

Topology & Data
  · Digital Twin · Topology
  · Discovery · Discovery Ops
  · CMDB · CMDB Drift
  · Transactions

Governance & Risk
  · Security Center
  · Compliance
  · Banking360 (pack)
  · Sustainability
  · Predictive Analytics
  · Governance / HA-DR

Work Management
  · ITSM
  · AI Agents
  · Copilot (panel)

Administration
  · Enterprise Admin (existing AdminNav groups)
  · Preferences · SSO · License & Trial

Help & Product
  · Help Center (new shell page — content from docs)
  · About (business narrative, not JSON)
  · Developer / Debug Mode (gated) — RC pages, API explorer, raw payloads

Hide from default nav (move to Debug / Admin › Release):
  · RC1 · RC2 · RC3 · Pilot Package (keep URLs)
```

---

## Persona navigation expectations

| Persona | Primary land | Must find in ≤2 clicks |
|---------|--------------|-------------------------|
| CIO / Business exec | Executive Home | Risks, revenue at risk, SLA, reports |
| CTO / Platform | Ops Intelligence / Admin | Capacity, HA, deployments |
| CISO | Security Center | Sessions, MFA, audit, policies |
| NOC / SRE | Ops Intelligence | Incidents, synthetics, dashboards |
| Cloud / DevOps | Observability / APM | Service map, fleet, topology |
| Administrator | Enterprise Admin | Tenants, IdP, licenses, backup |

---

## Scoring

| Criterion | Score | Gap |
|-----------|------:|-----|
| Hierarchy | 1.5 | Flat list |
| Naming consistency | 3.0 | Mostly clear; “Security” vs “Security Center” |
| Logical grouping | 1.5 | Absent |
| Click depth | 3.5 | Shallow (good) but noisy |
| Breadcrumbs | 2.0 | Incomplete labels |
| Searchability | 2.5 | Palette partial |
| Discoverability | 2.0 | Admin orphans |
| Keyboard | 2.5 | Palette only |
| Favorites / Recents | 1.0 | Missing |
| Enterprise feel | 2.0 | RC clutter |

---

## Recommendations (no capability removal)

1. Introduce **nav sections** in `DashboardShell` (collapsible groups).  
2. Deduplicate Security; rename single entry **Security Center**.  
3. Move RC/Pilot to **Debug Mode** or Admin › Release (URLs remain).  
4. Sync Command Palette to the same nav model (single source of truth).  
5. Expand breadcrumb dictionary for all routes; add section crumb.  
6. Honor Preferences `landingPath` on login.  
7. Add Favorites + Recents (localStorage / user prefs — presentation only).  
8. Profile menu: Preferences, License, About, Sign out (replace inert header name).
