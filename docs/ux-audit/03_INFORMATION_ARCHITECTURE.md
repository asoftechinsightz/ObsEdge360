# 03 — Information Architecture

---

## Method

For each major surface, ask:

1. Primary purpose?  
2. Understood in **5 seconds** (operator)?  
3. Understood in **30 seconds** (executive)?  
4. Unnecessary information visible?  
5. Related actions grouped?  
6. Workflow simplifiable without removing capability?

---

## Platform IA themes

### Theme A — Capability exists, story missing

Pages such as Discovery, Twin, Topology, Synthetics, Ops Intelligence have real workflows but inconsistent **page purpose statements**, weak **primary action** placement, and uneven empty guidance.

### Theme B — Capability wrapped as JSON console

About, Marketplace, Commercial (parts), Reports/ITSM in places, Preferences MFA, RC1, and most Admin pages expose API payloads as the UI. Purpose is opaque; executives fail the 30-second test; operators must parse fields mentally.

### Theme C — Dual chrome without dual IA

`DashboardShell` (flat) + `AdminNav` (grouped chips) teach two mental models. Promote Admin’s grouping pattern upward; keep Admin chips as tertiary.

### Theme D — Overlapping homes

| Surface | Intended purpose | Conflict |
|---------|------------------|----------|
| `/dashboard` | Enterprise health | Mock SLA; fallback KPIs |
| `/ops-intelligence` | Live ops brain | Better SRE home; not linked as such |
| `/dashboards` | Configurable NOC | Studio still dumps truncated JSON |
| `/admin` | Platform admin KPIs | Shows releaseTrack / gaClaim |

**Recommendation:** Explicitly brand three homes — Executive · Operations · Administration — and route personas accordingly (preferences + optional role default). Do not delete any.

---

## Cognitive overload sources

1. Peer-level nav of ~38 items.  
2. RC/engineering readiness in primary product chrome.  
3. Raw JSON panels without field labeling.  
4. Multiple similarly named entries (Discovery / Discovery Ops; Security ×2; CMDB / Drift).  
5. Admin routes reachable by URL but absent from AdminNav (orphan IA).

---

## Page purpose checklist (template for remediations)

Every page header should contain:

| Element | Example |
|---------|---------|
| Title | Ops Intelligence |
| One-line purpose | Correlate incidents, anomalies, and RCA for rapid response |
| Primary CTA | Investigate open incidents |
| Secondary CTAs | Open Copilot · View synthetics |
| Context filters | Tenant / time range / severity |
| Last updated | Timestamp or live indicator |

---

## Simplification principles (preserve capability)

1. **Progressive disclosure** — summary cards first; details in drawers/tabs; raw JSON only in Debug.  
2. **One job per view** — e.g. License page = plan, seats, renewal, usage — not dump of subscription JSON.  
3. **Group related actions** — “Respond”, “Configure”, “Export” clusters.  
4. **Demote rare tasks** — RC approve, certification dumps → Admin › Release / Debug.  
5. **Alias, don’t delete** — Service Map stays inside APM; optional nav alias “Service Map → /apm?tab=map”.

---

## 5-second / 30-second audit (selected)

| Page | 5s | 30s | Primary fix |
|------|:--:|:---:|-------------|
| Executive Home | Pass | Partial | Truthful SLA; AI recommendations; owners |
| Ops Intelligence | Pass | Pass | Tighten hierarchy; empty states |
| About | Fail | Fail | Replace JSON with company/product narrative |
| Marketplace | Fail | Fail | Catalog cards from existing payloads |
| RC1/RC2/RC3 | Fail* | Fail* | Remove from daily IA (*ok in Debug) |
| Admin HA/Backup | Partial | Fail | Status cards + timeline; JSON → Debug |
| Security Center | Pass | Pass | Remove API hint in empty state |
| Twin / Topology | Pass | Partial | Legend, business labels, “why red?” |
| Reports | Partial | Fail | Report gallery + preview, not JSON |
| ITSM | Partial | Fail | Queue tables + SLA chips from data |

\*Fail for customer-facing IA; acceptable for internal release engineers in Debug Mode.
