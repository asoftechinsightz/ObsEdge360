# Installation Guide — RC1

1. Provision Linux host or Kubernetes cluster.
2. Copy `.env.prod.example` → `.env` (never commit secrets).
3. Set `APP_ENV=production`, `AUTHZ_ENFORCE=true`, strong JWT/secrets.
4. Bring up core profiles: postgres, redis, kafka as required.
5. Run migrate container / `node database/migrations/run.js`.
6. Start api-gateway, domain services, web, nginx.
7. Validate `/api/v1/health` and `/about`.
8. Configure SSO/IdP and MFA policy.
9. Activate trial or import license.
10. Run `scripts/vps-p4-rc1-validate.sh` (or equivalent).
