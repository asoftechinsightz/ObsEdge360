# Upgrade Guide — RC3

```bash
cd /opt/OpsEdge360
git fetch   # or bundle
git checkout feature/rc3-enterprise-pilot-program  # or release tag
# ensure SECRETS_MASTER_KEY present in .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod build api-gateway web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --force-recreate api-gateway web
bash scripts/vps-rc3-validate.sh
```

From RC2: additive only. Re-login to obtain `jti`-bound tokens. Existing MFA factors re-encrypt on next verify if still plaintext.
