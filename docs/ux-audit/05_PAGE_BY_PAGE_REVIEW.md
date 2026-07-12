# 05 — Page-by-Page Review

**Scoring (1–5):** N=Navigation fit · D=Density · E=Executive · O=Operational · L=Learnability · V=Visual hierarchy · A=Accessibility · P=Perf perception · R=Enterprise readiness  

**Legend:** JSON = exposes raw JSON / tokens in standard UI · OK = usable · POLISH = structure OK, needs presentation  

---

## Auth & marketing

| Route | Purpose | N | D | E | O | L | V | A | P | R | Notes / recommendation |
|-------|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|------------------------|
| `/` | Marketing landing | 3 | 3 | 3 | 1 | 4 | 3 | 2 | 3 | 3 | Brand-first OK; align with GTM copy |
| `/login` | Sign-in + MFA/SSO | 4 | 3 | 2 | 3 | 4 | 3 | 3 | 3 | 4 | Honor landingPath after auth |
| `/signup` | Trial signup | 3 | 3 | 2 | 2 | 4 | 3 | 3 | 3 | 3 | Guided next steps post-signup |
| `/forgot-password` | Reset request | 4 | 2 | 1 | 2 | 4 | 3 | 3 | 3 | 4 | OK |
| `/reset-password` | Set password | 4 | 2 | 1 | 2 | 4 | 3 | 3 | 3 | 4 | OK |
| `/auth/callback` | SSO return | 3 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | Friendly progress + error states |

## Executive & commercial

| Route | Purpose | Scores (N/D/E/O/L/V/A/P/R) | Finding |
|-------|---------|----------------------------|---------|
| `/dashboard` | Executive Home | 3/3/**3**/2/3/3/2/3/3 | POLISH — mock SLA; silent KPI fallbacks; add actions/owners |
| `/reports` | Executive reports | 3/2/3/2/2/2/2/2/2 | **JSON** — gallery + preview cards |
| `/demo` | Evaluation tours | 3/3/3/2/4/3/3/3/4 | OK — model for guided UX |
| `/security` | Security Center | 4/3/2/4/3/3/3/3/4 | OK — remove API path hints in empty state |
| `/pilot` | Pilot package | 2/3/2/2/3/3/2/3/2 | Demote from daily nav; hide token |
| `/rc1` `/rc2` `/rc3` | Release readiness | 1/2/1/2/2/2/1/2/1 | **JSON/tokens/SHA** — Debug/Admin only |
| `/commercial` | License & trial | 3/2/3/2/3/2/2/2/2 | **JSON** — plan cards, seats, renewal |
| `/about` | About product | 2/1/2/1/2/1/1/2/1 | **JSON** — company/product narrative |
| `/marketplace` | Marketplace | 2/1/2/2/2/1/1/2/1 | **JSON** — catalog cards |
| `/preferences` | User prefs | 3/3/1/2/3/3/3/3/3 | Wire landingPath; MFA status cards not JSON |

## Core product

| Route | Purpose | Finding |
|-------|---------|---------|
| `/discovery` | Discovery engine | POLISH — wizard exists; strengthen empty/progress |
| `/discovery-ops` | Discovery operations | POLISH — clarify vs Discovery in nav subtitle |
| `/twin` | Digital Twin | POLISH — legend, business labels, selection inspector (not raw) |
| `/topology` | Live topology | Same as twin |
| `/ops-intelligence` | Ops brain / incidents | **Strength** — primary ops home candidate |
| `/dashboards` | NOC dashboard list | POLISH |
| `/dashboards/[id]` | Dashboard studio | Truncated **JSON** widgets → typed renderers |
| `/aiops` | LLM RCA | POLISH — timeline + recommendation cards |
| `/cmdb` | CMDB explorer | POLISH — table-first, relationship drawer |
| `/cmdb/drift` | Config drift | POLISH — risk matrix of drifts |
| `/itsm` | ITSM | **JSON** tendency — queues, SLA chips, ticket tables |
| `/transactions` | Business transactions | POLISH — journey health, revenue tag |
| `/transactions/[classification]` | Detail | POLISH — timeline + deps |
| `/observability` | Infra monitoring | POLISH — hide Prometheus config JSON behind Debug |
| `/synthetics` | Synthetics | POLISH — journey cards + waterfall viz |
| `/fleet` | Agents | POLISH — fleet health table |
| `/apm` | APM + service map | POLISH — promote Service Map alias in nav |
| `/network` | Network observability | POLISH |
| `/ot` | OT / industrial | POLISH — safety-first copy |
| `/compliance` | Compliance | POLISH — posture score + control gaps |
| `/banking360` | BFSI pack | OK/POLISH — EmptyState already used |
| `/sustainability` | Sustainability | POLISH — KPI + trend |
| `/analytics` | Predictive | POLISH — forecast cards |
| `/quantum` | Quantum readiness | Demote prominence until customer-driven |
| `/governance` | HA-DR governance | POLISH — status + drill to admin |
| `/agents` | AI agents | POLISH — agent status cards |
| `/settings/sso` | SSO settings | POLISH — forms over dumps |

## Admin (pattern summary)

~60 admin routes under `/admin/**`.  
**Pattern:** `AdminShell` + `AdminNav` chips + frequent `JSON.stringify` panels.

| Group | Examples | UX verdict |
|-------|----------|------------|
| Platform | `/admin`, platform, capacity, storage, quotas, licenses, settings, tenants | Convert counts → cards; hide gaClaim |
| Security | policies, sessions, passwords, system security, audit, secrets | Tables + policy editors; raw → Debug |
| Reliability | health, HA, cluster, nodes, replication, failover, backup, restore, deployment | Status timeline + health badges |
| Automation | workflows, executions, e-stop, simulations | Designer canvas + run history table |
| Integrations | connectors, notifications, IdP, LDAP/SAML/OIDC | Catalog cards + config forms |
| Release | certification, RC, GA, governance | **Internal** — Debug Mode default |

**Orphan routes** (URL-only vs AdminNav): backup-verify, backup/restore certification, upgrade-status, automation, policy-manager, executions, automation-history, simulations, connector-config/health, delivery-history, ldap/saml/oidc-config, sync-status → add to chips or nested menus.

---

## Cross-cutting page defects

1. Missing Help / Profile / API Explorer routes.  
2. Incidents lack dedicated route (embedded in Ops Intelligence) — OK if aliased.  
3. Copilot is panel-only (good) but under-linked from dashboards.  
4. Notifications present; no “mark all / preferences” depth visible in audit.

---

## Priority remediation classes

| Class | Pages | Action |
|-------|-------|--------|
| P0 Trust | RC*, About, Marketplace, Commercial JSON, Admin gaClaim, tokens | Remove from standard UI / Debug Mode |
| P1 Executive | Dashboard, Reports, Compliance | Decision narrative + truthful charts |
| P2 Operator | Ops Intelligence, Synthetics, Twin, CMDB, ITSM | Tables/charts + empty states |
| P3 Admin console | All JSON admin | Card/table mapping |
| P4 Chrome | Nav, palette, breadcrumbs, prefs landing | IA regroup |
