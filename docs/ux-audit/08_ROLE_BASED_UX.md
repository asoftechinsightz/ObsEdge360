# 08 — Role-Based UX

**Today:** No role-based landing. Preferences `landingPath` is stored but **not applied** at login. JWT carries role but UI ignores it for home selection.

---

## Target landing map (UX routing only)

| Role | Default landing | First viewport must show |
|------|-----------------|--------------------------|
| CIO / Business Executive | `/dashboard` | Health, revenue at risk, SLA, top risks, AI recs |
| CTO | `/ops-intelligence` or `/admin/platform` | Reliability + change risk |
| CISO | `/security` | MFA coverage, sessions, alerts, audit entry |
| NOC | `/ops-intelligence` | Open incidents, severity, acknowledge CTAs |
| SOC | `/security` (+ compliance link) | Security alerts, suspicious sessions |
| Platform Engineer | `/admin` | Capacity, HA, cluster, deployments |
| Cloud Engineer | `/observability` or `/apm` | Service health, map, infra |
| DevOps | `/apm` / `/fleet` | Deploy impact, agents, synthetics |
| SRE | `/ops-intelligence` | Error budgets, incidents, RCA |
| Administrator | `/admin` | Tenants, IdP, licenses, policies |
| Evaluator / Prospect | `/demo` | Guided tours |

---

## Implementation approach (freeze-safe)

1. Apply saved `landingPath` on successful login (bugfix / completion).  
2. Optional: suggest default `landingPath` from role on first login (preference write).  
3. Nav **pinning**: show section relevance (e.g. CISO pins Governance & Risk).  
4. Do **not** hide capabilities permanently by role unless existing auth already enforces — prefer order/emphasis.  
5. Executive chrome: denser KPIs; Operator chrome: queues + timelines.

---

## Executive experience requirements

Executive Home must communicate:

- Overall platform / business-service health  
- Critical business risks  
- SLA compliance (truthful data)  
- Revenue at risk  
- Active incidents (count + link)  
- AI recommendations (Copilot/ops-derived)  
- Compliance posture  
- Sustainability metrics  
- Recent changes (link ITSM/change if data exists)

This is **decision support**, not packet debugging.

---

## Operator experience requirements

- Queue-first layouts  
- Keyboard acknowledge / assign where APIs exist  
- Clear severity  
- Blast radius via twin/topology links  
- Runbook / ITSM deep links  
- No JSON in the critical path
