# Deploy OpsEdge360 to VPS

**Target:** Ubuntu 24.04 LTS  
**Domains:** `observability360.asoftechinsightz.com` (web) · `api.observability360.asoftechinsightz.com` (API)

OpsEdge360 is a **standalone product** — not deployed inside LeadEdge360 or RetailEdge360.

---

## 1. DNS

| Record | Type | Value |
|--------|------|-------|
| `observability360` | A | VPS public IP |
| `api.observability360` | A | VPS public IP |

---

## 2. Server prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git nginx certbot
sudo usermod -aG docker $USER
```

---

## 3. Clone and configure

```bash
git clone <your-repo-url> /opt/observability360
cd /opt/observability360/OpsEdge360
cp .env.prod.example .env
# Edit .env — set JWT_SECRET, POSTGRES_PASSWORD
```

---

## 4. TLS certificates (Let's Encrypt)

```bash
sudo certbot certonly --standalone -d observability360.asoftechinsightz.com -d api.observability360.asoftechinsightz.com
sudo mkdir -p infra/nginx/certs
sudo cp /etc/letsencrypt/live/observability360.asoftechinsightz.com/fullchain.pem infra/nginx/certs/
sudo cp /etc/letsencrypt/live/observability360.asoftechinsightz.com/privkey.pem infra/nginx/certs/
```

---

## 5. Start stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --build
```

This starts:

- PostgreSQL, Redis, Kafka (`core` profile)
- DB migrations (one-shot)
- Microservices: discovery, cmdb, observability, compliance, transactions, security
- API gateway (:4000)
- Web UI (:3000)
- Nginx (:80/:443)

---

## 6. Smoke test

```bash
npm run smoke
# Or against production:
OBS360_GATEWAY_URL=https://api.observability360.asoftechinsightz.com \
OBS360_WEB_URL=https://observability360.asoftechinsightz.com \
npm run smoke
```

Create first organization at `https://observability360.asoftechinsightz.com/signup`.

---

## 7. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do **not** expose Postgres (5432) or Redis (6379) publicly.

---

## 8. Backups

```bash
# Daily Postgres dump (cron example)
0 2 * * * docker exec $(docker ps -qf name=postgres) pg_dump -U trinetra trinetra360 | gzip > /var/backups/opsedge360-$(date +\%F).sql.gz
```

---

## 9. Local development (unchanged)

```bash
cp .env.example .env
# AUTH_REQUIRED=false for dev bypass optional
docker compose --profile core up -d
npm install
npm run db:migrate
npm run dev
```

- Marketing: http://localhost:3000  
- Sign up: http://localhost:3000/signup  
- Console: http://localhost:3000/dashboard  

---

## Related

- [PRODUCT_IDENTITY.md](./PRODUCT_IDENTITY.md)
- [DEPLOYMENT-TOPOLOGY.md](./DEPLOYMENT-TOPOLOGY.md)
- [PENTEST-REMEDIATION.md](./PENTEST-REMEDIATION.md)
- [BACKUP-RESTORE.md](./BACKUP-RESTORE.md)
- [HA-RUNBOOK.md](./HA-RUNBOOK.md)
- [RELEASE-NOTES-1.0.0.md](./RELEASE-NOTES-1.0.0.md)
- [SPRINT_PLAN.md](../SPRINT_PLAN.md)
