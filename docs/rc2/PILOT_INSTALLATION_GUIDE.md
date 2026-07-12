# Pilot Installation Guide — OpsEdge360 RC2

**Audience:** Customer success / partner engineers installing a pilot  
**Channel:** `v1.0.0-rc2-pilot`  
**Prerequisite:** Docker Engine + Compose v2, 8+ GB RAM, outbound HTTPS (or air-gap package)

## Topology options

| Mode | Artifact | When |
|------|----------|------|
| Single-node Compose | `docker-compose.prod.yml` | Typical PoC |
| HA Compose | `docker-compose.ha.yml` | Resilience demo |
| Demo plane | `docker-compose.demo.yml` | Sales sandbox (outbound kill-switch) |
| Kubernetes | `infra/helm/opsedge360` | Enterprise target (gateway/web focus) |

## Quick start (Compose)

```bash
git clone <repo> OpsEdge360 && cd OpsEdge360
git checkout feature/rc2-pilot-production-readiness   # or release tag when cut
cp .env.example .env                                  # if present; else set vars below
# Required:
#   JWT_SECRET=<256-bit>
#   POSTGRES_PASSWORD=...
#   Do NOT set OPS_MFA_LAB_CODES for customer pilots
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api-gateway node database/migrations/run.js
```

### Ports (typical)

| Service | Port |
|---------|------|
| Web | 3000 / 443 via ingress |
| API gateway | 4000 |
| Postgres | 5432 (internal preferred) |
| Redis | 6379 (internal) |

## Verify

```bash
curl -sk https://<api-host>/api/v1/health
curl -sk https://<api-host>/api/v1/branding   # product == OpsEdge360
bash scripts/vps-rc2-validate.sh              # on installed host
```

## First admin steps

1. Sign up or use provisioned admin.  
2. Open `/security` → Enroll TOTP → Verify → store backup codes.  
3. `PUT /api/v1/security/mfa-policy` with `{ "mode": "required" }`.  
4. Logout / login — confirm MFA challenge.  
5. Run `/demo` reset and Banking walkthrough.

## Failure modes

| Symptom | Check |
|---------|-------|
| 502 from web | Gateway healthy? `docker compose ps` |
| Migration skip | `rc2_readiness` missing → re-run migrate; ensure 045/046 applied |
| MFA enroll fails | Auth token present; tables `mfa_factors` / `mfa_backup_codes` exist |
| Lab code rejected | Expected — use authenticator TOTP unless `OPS_MFA_LAB_CODES=1` |

## Air-gap

```bash
bash scripts/airgap-package.sh
bash scripts/airgap-verify.sh
# Transfer bundle; load images; compose up offline
```

## Rollback

See [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) — redeploy RC1 SHA `ac6c6ba58ef72b16e24d93a4be30215795577c97`; keep additive migrations.
