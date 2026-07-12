# Rollback Plan — RC2 → RC1

## Target

Redeploy **RC1 validated** Git SHA:

```
ac6c6ba58ef72b16e24d93a4be30215795577c97
```

Token reference: `P4_RC1_MARKET_VALIDATION_OK`

## Steps

1. Announce maintenance to pilot stakeholders.  
2. Take a fresh Postgres backup (`scripts/backup-postgres.sh`).  
3. Check out RC1 SHA on the deploy host:

```bash
cd /opt/OpsEdge360
git fetch --all
git checkout ac6c6ba58ef72b16e24d93a4be30215795577c97
```

4. Rebuild and restart Compose (or Helm rollback revision):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

5. **Do not** reverse migrations 045/046. They are additive; RC1 app ignores unused tables/columns.  
6. Smoke: `GET /api/v1/health`, `GET /api/v1/about`, login without MFA challenge (unless RC1 policy already required).  
7. Record incident ticket with before/after SHAs.

## Database note

| Migration | On rollback |
|-----------|-------------|
| 045 RC2 tables/columns | Leave in place |
| 046 `mfa_challenge` CHECK | Leave in place |

Destructive down-migrations are unsupported for pilots.

## When to rollback

- Critical regression in auth/MFA blocking all users with no workaround  
- Data corruption attributable to RC2 code path  
- Customer mandate to return to RC1 baseline during evaluation
