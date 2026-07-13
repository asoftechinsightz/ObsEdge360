# Sprint 1 — Known Issues & Technical Debt

## Known issues

| ID | Severity | Issue | Mitigation |
|----|----------|-------|------------|
| S1-KI1 | Low | CIO layout helper still treats `role===cio` as broadly visible (network still listable, demoted by position) | Accept for Sprint 1; tighten role filter in Sprint 10 |
| S1-KI2 | Med | Incident widgets empty if tenant has no `ops_incidents` rows | Load EDE pack before demo |
| S1-KI3 | Low | Light theme / AA formal audit deferred | Sprint / v1.1 UI certification |
| S1-KI4 | Med | Prod screenshots may lag until redeploy | Redeploy web+gateway+nginx |

## Technical debt

| ID | Priority | Item | Effort |
|----|----------|------|--------|
| S1-TD1 | High | OpenAPI stub for `/dashboard/executive` contract freeze | S |
| S1-TD2 | Med | `@RequirePermission('dashboard:read')` on controller | S |
| S1-TD3 | Med | Remove unused legacy `/executive/*` UI widgets | M |
| S1-TD4 | Low | Permission-denied dedicated home state | S |
| S1-TD5 | Med | Integration test against seeded postgres | M |

No hidden debt — tracked above.
