# Deployment Architecture v1.0

**Document ID:** OE360-DEPLOY-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

---

## 1. Runtime (production today)

| Layer | Technology |
|-------|------------|
| Host | Linux VPS |
| Orchestration | Docker Compose (`docker-compose.prod.yml` + base) |
| Edge | Nginx + TLS certificates |
| Web | `observability360.asoftechinsightz.com` |
| API | `api.observability360.asoftechinsightz.com` |
| DB | PostgreSQL `trinetra360` |
| Cache / bus | Redis, Kafka |

## 2. Production locks

Domains, DB name, Nginx/SSL, volume names, migrations 001–014 — change-controlled only.

## 3. Deploy principles

1. Backup before risky changes  
2. Migrate then roll services  
3. Smoke health endpoints  
4. Rollback plan known (images/volumes)  
5. No undocumented prod edits  

## 4. Environments

| Env | Purpose |
|-----|---------|
| Local compose | Dev |
| Staging | PRR / pre-prod validation |
| Production | Customer-facing locks above |

## 5. Future (not v1.0 runtime)

Helm charts, CD pipelines, Vault, multi-region — Phase 6. Values without templates do not constitute a supported K8s install path yet.

## Related

`docs/DEPLOY-VPS.md` (ops detail) · `RELEASE_CHECKLIST.md` · Performance/Security baselines  
