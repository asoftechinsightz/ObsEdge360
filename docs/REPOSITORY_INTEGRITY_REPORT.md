<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Repository Integrity Report

**Date:** 2026-07-06  
**Branch:** rebrand/opsedge360-phase-0b

## Scope

Post-rebrand integrity check for OpsEdge360 monorepo.

## Package namespace

- Root: opsedge360
- Workspaces: @opsedge360/* (apps, services, packages)

## Source legacy scan

Run: `rg -i "trinetra360|@trinetra360|Observability360" --glob '!node_modules/**' --glob '!.next/**' --glob '!docs/archive/**'`

Expected residual: DB defaults, deployment docs, OpenAPI filename, Helm paths.

## Migrations

001–014 wired in run.js including password_reset_tokens.

## Docker

- Kafka: bitnamilegacy/kafka:3.7.0-debian-12-r5
- Dockerfile.service CMD: node dist/index.js
- prod: restart unless-stopped, healthchecks

## Validation commands

```bash
npm install && npm run build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod config
```

## Status (laptop — 2026-07-06)

| Check | Result |
|-------|--------|
| `npm install` | ✅ @opsedge360 workspaces linked |
| `npm run build` | ✅ All packages + Next.js 27 routes |
| Docker compose config | ⏭️ Docker CLI not available on this laptop |
| Legacy source scan | ✅ Only intentional refs (DB seed, dev auth, archive docs) |

**Laptop Phase 0 code + docs complete — awaiting release gate approval for VPS deploy.**
