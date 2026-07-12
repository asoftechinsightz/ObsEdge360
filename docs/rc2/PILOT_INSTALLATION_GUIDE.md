# Pilot Installation Guide

1. Provision Linux host or K8s namespace (min 8 GB RAM for pilot).
2. Copy `.env.prod.example` → `.env`; set strong `JWT_SECRET`, `AUTHZ_ENFORCE=true`, `APP_ENV=production` (or `demo` for evaluation plane).
3. Start Compose core+prod profiles (or Helm chart).
4. Run migrations (`migrate` container) — confirm 045 / `rc2_readiness`.
5. Verify `GET /api/v1/health` and `GET /api/v1/branding`.
6. Create admin via signup or IdP SSO.
7. Set MFA policy to `optional` or `required`; enroll TOTP.
8. Activate commercial trial if needed.
9. Seed/demo tours via `/demo`; run demo reset before customer session.
10. Run `scripts/vps-rc2-validate.sh` (or equivalent) and retain evidence.
