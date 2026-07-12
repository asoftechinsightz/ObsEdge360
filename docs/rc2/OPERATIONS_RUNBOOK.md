# Operations Runbook — RC2 Pilot

**Environment:** Customer pilot / PoC  
**Deploy branch / channel:** `v1.0.0-rc2-pilot`

## Daily

```bash
# Health
curl -sk https://<api>/api/v1/health
docker compose -f docker-compose.prod.yml ps

# Disk / DB
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c 'SELECT now();'
df -h
```

- Review open alerts: `GET /api/v1/security/alerts` or Security Center.  
- Skim login failures: `GET /api/v1/security/login-history?limit=50`.

## Weekly

```bash
bash scripts/backup-postgres.sh
bash scripts/backup-certify.sh   # if used in env
```

- Confirm MFA policy still `required` for production-like pilots.  
- Confirm `OPS_MFA_LAB_CODES` is unset.  
- Rotate demo org if shared with multiple SE sessions (`POST /demo/reset`).

## Incident triage (auth / MFA)

1. User locked → check `auth_lockouts`; wait lockout or clear with DBA approval.  
2. MFA lost → admin issues new enroll after identity proof; regenerate backup codes.  
3. Suspected session compromise → Security Center → Revoke all sessions; force password reset.

## Deploy / upgrade

```bash
cd /opt/OpsEdge360
git fetch && git checkout <rc2-sha>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api-gateway node database/migrations/run.js
bash scripts/vps-rc2-validate.sh
```

## SLOs (pilot)

See [SLA_GUIDE.md](./SLA_GUIDE.md). Alert on API health fail > 5 minutes.
