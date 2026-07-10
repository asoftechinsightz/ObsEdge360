# ADR-008: Session Cookie Hardening Strategy

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Frontend Lead  
**Phase:** Plan in Phase 1; **implementation in Phase 2**  

---

## Context

Web app stores JWT in `oe360_token` cookie that is **readable by JavaScript** (not HttpOnly) so the client can attach `Authorization: Bearer` and decode display name. This increases impact of XSS.

Phase 1 scope is already large; changing cookie semantics mid-wire risks auth regressions.

## Decision

1. **Phase 1:** Document the target model and add backlog item only — **no production auth cookie code change** in Phase 1 unless a trivial safe fix is approved separately.
2. **Phase 2 target model (preferred):**
   - Prefer **HttpOnly + Secure + SameSite=Lax/Strict** session cookie set by gateway (BFF pattern), **or**
   - Keep Bearer in memory + short-lived access token + refresh cookie HttpOnly.
3. Remove need for JS to read raw JWT for API calls (use `credentials: 'include'` to gateway).
4. Display name via `/auth/me` instead of client-side JWT decode.

## Alternatives considered

| Alternative | Why rejected for Phase 1 |
|-------------|---------------------------|
| Implement HttpOnly immediately | Cross-cuts web + gateway; high regression risk during wire-up |
| Do nothing forever | Unacceptable security debt |

## Consequences

**Positive:** Clear security trajectory without blocking Phase 1 exit.  
**Negative:** XSS→token risk remains until Phase 2.  

## Compliance

- Must not weaken CSRF posture when moving to cookie credentials (Phase 2 ADR refinement).
