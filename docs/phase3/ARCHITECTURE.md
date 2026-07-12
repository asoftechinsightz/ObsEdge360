# Phase 3 — Architecture Notes

## Additive surfaces

- `/me/preferences`, `/me/notifications`, `/me/mfa`
- `/itsm/*`
- `/synthetics/browser/journeys*`
- `/reports*`
- `/marketplace/extensions`
- `/banking360/payment-monitors*`
- Copilot `structured` payload on `/copilot/chat`

## Principles

- Do not fabricate conclusions — structured disclaimer required
- Browser synthetics Phase B uses live navigation probe; full Chromium optional next
- Marketplace is registry-only (no public store)
- MFA framework ready, not enforced
