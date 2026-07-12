# 02 — Workstream 2: Enterprise Support

**Goal:** Resolve customer issues fast with repeatable diagnostics — not heroics.

## Capabilities

| Need | Existing / program asset |
|------|--------------------------|
| Support ticket workflow | ITSM `/itsm` + external ticketing; log linkage in CVP Feedback |
| Diagnostic bundles | `scripts/diagnostics-bundle.sh`, `docs/commercial/DIAGNOSTICS_BUNDLE.md` |
| Log collection package | Diagnostics bundle + gateway/service logs per operator guide |
| Support mode | Developer Mode + Presentation off; Debug for technical payloads only |
| Customer issue timeline | CVP Feedback status history + meeting notes; ITSM problem records |
| Environment comparison | Admin tenants/settings; document env labels (no `APP_ENV=` in customer UI) |
| Health report generator | `/reports` executive/ops reports + CS dashboard `/admin/cvp/success` |

## Support playbook (minimum)

1. Open / link ticket (ITSM or external).  
2. Capture tenant, version, environment label, impact.  
3. Run diagnostics bundle (customer-approved).  
4. Timeline: detect → acknowledge → mitigate → resolve.  
5. Log feedback in CVP (category, severity, business impact).  
6. If enhancement requested → Feature Board (needs named customer).  

## Escalation

Use `docs/pilot/SUPPORT_ESCALATION_GUIDE.md` and `docs/commercial/SUPPORT_HANDBOOK.md`.

## TITAN improvements (freeze-safe)

Prefer checklist and packaging improvements over new ticket products. Only build new support UI if **two pilots** request the same gap.
