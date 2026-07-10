# Phase 1 Lessons Learned

**Document ID:** OE360-PHASE1-LESSONS-001  
**Date:** 2026-07-10  
**Status:** Handoff — required before Phase 2  
**Phase 1 decision:** Conditionally Approved (pending staging/production validation checklist)

---

## 1. What worked well

1. **Audit → Plan → ADR → Implement** sequencing prevented scope creep into RBAC/AI/Studio during Phase 1.
2. **ADR-003 Option B** was the right call — avoided shipping gateway routes to services that are not in `docker-compose.prod.yml` (would have caused production 502s).
3. **Additive gateway wiring** (topology, pipeline, agent config) delivered Sprint 0 honesty without breaking existing heartbeat/metrics contracts.
4. **Shared `mountOpsEndpoints`** gave a consistent `/health|/ready|/live|/version|/metrics` pattern across services without forking each service’s health logic.
5. **Banking360 as optional pack (soft-decouple)** aligned product strategy with a low-risk feature flag (`NEXT_PUBLIC_PACK_BANKING360_ENABLED`, default `true`).
6. **Frozen governance docs** (`FROZEN_*`, industry packs policy) reduced ambiguity for later phases.
7. **Automated gates** (typecheck, unit tests, build) caught issues early; Trivy CRITICAL-as-fail raises the security bar for CI.
8. **Milestone commits** on a feature branch kept `main` clean and preserved rollback granularity.

---

## 2. Technical debt remaining

| ID | Debt | Severity | Owner phase |
|----|------|----------|-------------|
| TD-P1-01 | Dual audit tables (`audit_log` vs `audit_logs`) | Medium | Phase 2 |
| TD-P1-02 | JWT `users.role` vs Sprint 0 `roles`/`user_roles` unused at gateway | High | Phase 2 |
| TD-P1-03 | `@opsedge360/shared-security` still not imported by gateway | High | Phase 2 |
| TD-P1-04 | JWT cookie still not HttpOnly (ADR-008 deferred) | High | Phase 2 |
| TD-P1-05 | Gateway health returns 200 when degraded by default | Low–Med | Phase 2 / ops tune |
| TD-P1-06 | Integration/E2E smoke not automated in CI (needs compose) | Medium | Phase 1 close / Phase 2 |
| TD-P1-07 | Discovery connectors still partially mock for some clouds | High | Later (post-security) |
| TD-P1-08 | Orphan gateway proxies to non-prod services (remediation/analytics/…) | Medium | Phase 2/6 |
| TD-P1-09 | `tsconfig.tsbuildinfo` committed under web (build artifact) | Low | Cleanup |
| TD-P1-10 | OpenAPI static file vs Nest Swagger still dual-maintained | Medium | Ongoing |
| TD-P1-11 | Redis/Kafka unauthenticated in compose | High | Phase 2 |
| TD-P1-12 | Platform self-monitoring (Prometheus/Grafana) not in prod compose | Medium | Phase 3 |

---

## 3. Deferred items (explicit)

| Item | Deferred to | Reason |
|------|-------------|--------|
| RBAC / ABAC enforcement | Phase 2 | Planned; library exists, not wired |
| API key HTTP auth | Phase 2 | Schema ready |
| MFA | Phase 2 foundation | Out of Phase 1 scope |
| Session cookie HttpOnly / BFF | Phase 2 (ADR-008) | Avoid auth regression during wire-up |
| Scheduler + config-management in prod | New ADR after Phase 2 hardening | Option B |
| Dashboard Studio / KPI / Report builders | Phase 5 | Vision phase |
| LLM Copilot / RAG | Phase 4 | AI phase |
| Helm templates / CD | Phase 6 | K8s not ready |
| Vault / KMS | Phase 2–6 | Secrets management |
| Full pack marketplace enablement | Phase 5 | Soft-decouple only in Phase 1 |
| Automated load / soak tests | Pre-sign-off + Phase 3 | Needs staging environment |

---

## 4. Risks carried forward

| Risk | Likelihood | Impact | Mitigation for Phase 2 |
|------|------------|--------|------------------------|
| Approving Phase 2 before staging smoke | Med | High | Enforce pre-sign-off checklist |
| XSS → JWT theft (non-HttpOnly cookie) | Med | High | Implement ADR-008 early in Phase 2 |
| Tenant isolation only via header trust | Med | High | Validate + plan RLS; enforce authz |
| Agent public routes abused if keys leak | Med | High | Rate-limit agent endpoints; rotate keys |
| Trivy CRITICAL may block CI on transitive CVEs | Med | Med | Waiver process already defined in ADR-007 |
| Docs claim vs VPS reality drift again | Med | Med | Update deploy guide after every smoke |
| Promoting experimental services too early | Med | High | Require amending ADR-003 |

---

## 5. Recommendations for Phase 2

1. **Start with a thin vertical slice:** JWT → RolesGuard → one protected route → audit log write — prove enforcement before broad rollout.
2. **Implement ADR-008 early** (session/cookie hardening) before adding more public surfaces.
3. **Unify role model:** migrate from `users.role` string to `roles` / `user_roles` with backward-compatible JWT claims.
4. **Wire `writeAuditLog`** on authz denials and admin mutations from day one of Phase 2.
5. **Add staging smoke job** (compose up + curl matrix) before calling Phase 2 “done” on any milestone.
6. **Do not promote scheduler/config-mgmt** until RBAC and secrets posture exist.
7. **Keep Banking360 pack-gated** — do not re-couple BFSI into core authz paths.
8. **Security dashboards** should consume audit + authz metrics, not invent a parallel event store.
9. **Zero Trust foundation** = mTLS plan + service identity design notes even if full mTLS lands later.
10. **Require Phase 2 ADRs** before coding (RBAC middleware, session model, secrets approach, MFA).

---

## 6. Process lessons

| Lesson | Action |
|--------|--------|
| Option B prevented a class of prod failures | Keep “compose before proxy” as a standing rule |
| Conditional approval > rubber-stamp | Keep staging smoke as a hard gate |
| Lessons Learned before next phase | Make this a mandatory phase exit artifact |
| Unit tests ≠ production validation | Separate “code complete” from “ops complete” |

---

## 7. Handoff checklist to Phase 2 lead

- [ ] Read `PHASE1_COMPLETION_AUDIT.md` (conditional)  
- [ ] Complete `PHASE1_PRE_SIGNOFF_CHECKLIST.md` on staging/VPS  
- [ ] Confirm E1–E11 with evidence links  
- [ ] Draft Phase 2 ADRs (RBAC, session, secrets, MFA, audit)  
- [ ] Do **not** start Phase 2 code until checklist + audit are signed  

---

*OpsEdge360 — Phase 1 Lessons Learned — AsoftechInsightz*
