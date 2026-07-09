<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Deployment Impact Report

## VPS deploy (post-approval)

1. rsync laptop → `/opt/observability360` (exclude `.env`, certs)
2. Run `scripts/apply-vps-patches.sh`
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --build`

## Risk

Low if domain, DB name, volumes unchanged. Migration 014 adds password_reset_tokens (non-breaking).

## Rollback

Tag `pre-opsedge360-phase0`; revert branch; redeploy previous images.
