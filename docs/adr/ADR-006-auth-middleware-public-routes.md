# ADR-006: Auth Middleware Public Routes

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** UX Architect, Security Architect  
**Phase:** 1  

---

## Context

Next.js middleware treats only `/`, `/login`, `/signup`, `/auth/callback` as public. `/forgot-password` and `/reset-password` exist but redirect unauthenticated users to login when `NEXT_PUBLIC_AUTH_REQUIRED` is true — breaking the reset flow.

## Decision

Add to middleware public path allowlist:

- `/forgot-password`
- `/reset-password`

No change to authenticated app routes. Keep SSO callback public.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Move reset into login modal only | Worse UX; pages already exist |
| Disable auth requirement globally | Unsafe |

## Consequences

**Positive:** Password reset works in production auth mode.  
**Negative:** Negligible increase in public surface (expected for auth flows).

## Compliance

- Reset tokens remain single-use server-side (existing API).
- No secrets in client.
