# Maintenance and Upgrade Guide

## Routine maintenance

| Cadence | Task |
|---------|------|
| Daily | Health check, alert skim |
| Weekly | Postgres backup + certify; disk/CPU review |
| Monthly | Dependency advisory review (SBOM + npm audit / Trivy) |
| Quarterly | DR restore drill on clone ([DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)) |

## Upgrade procedure

```bash
cd /opt/OpsEdge360
bash scripts/backup-postgres.sh
# Obtain commercial package or git/bundle for target SHA
# Preserve .env (never overwrite with samples)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d
curl -sk https://<api>/api/v1/health
```

Also see: `scripts/upgrade-onprem.sh`, `docs/rc3/UPGRADE_GUIDE.md`.

## Rollback

1. Restore previous app SHA (RC3 `4f39eec` / RC2 `a2d7e44` / RC1 `ac6c6ba` as applicable).  
2. **Keep database migrations forward** (additive).  
3. If restoring DB dump, use DR guide — destroys current DB.

## Secret rotation

- Rotate `JWT_SECRET` only with planned re-login window.  
- Keep `SECRETS_MASTER_KEY` stable if MFA secrets encrypted; rotating requires re-enroll or re-encrypt job (not automated in v1).  

## Version policy

Commercial channel tracks product releases (v1.0 → v1.1 → v2.0). See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md).
