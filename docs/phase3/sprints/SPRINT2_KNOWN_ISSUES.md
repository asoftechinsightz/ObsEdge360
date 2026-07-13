# Sprint 2 — Known Issues

| ID | Severity | Issue | Mitigation / Plan |
|----|----------|-------|-------------------|
| S2-KI1 | Medium | Live SkyWalking GraphQL client not wired; engine slot serves curated OpsEdge fixtures when live telemetry is sparse | Configure connector in a later integration sprint; UI remains unchanged |
| S2-KI2 | Medium | Formal WCAG AA / light-theme screenshot pack incomplete | Carry from RC1 residual → v1.1 |
| S2-KI3 | Low | Legacy `/apm` page still available via Debug nav | Prefer `/observability/*`; remove after one release soak |
| S2-KI4 | Low | CMDB type filters for K8s/containers may over-include `cloud_resource` rows on large estates | Refine tags in Sprint 3 Twin hardening |
| S2-KI5 | Low | AI explain uses Copilot chat + observe evidence pack; full RCA confidence bar still Sprint 4 depth | Acceptable for Sprint 2 journey |

**Critical / High:** none known at implementation close.
