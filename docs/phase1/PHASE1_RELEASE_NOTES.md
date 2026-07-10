# Phase 1 Release Notes

**Version:** Phase 1 Harden & Wire  
**Date:** 2026-07-10  

## Summary

Phase 1 wires Sprint 0 APIs through the production API gateway, hardens health/auth/CI, and soft-decouples Banking360 as an optional solution pack — without breaking production locks.

## Added (backward compatible)

- Gateway: CMDB topology, observability pipeline, agent config/updates  
- Gateway: dependency health probes; `/ready`, `/live`, `/version`, `/metrics`  
- Standard ops endpoints on core microservices  
- OpenAPI paths for new APIs  
- `NEXT_PUBLIC_PACK_BANKING360_ENABLED` (default enabled)  
- CI fails on Trivy CRITICAL  

## Explicitly not in production (ADR-003 Option B)

- Scheduler and config-management remain experimental (local only)

## Security notes

- Agent config routes use `X-Agent-Key` (no JWT), per ADR-004  
- Cookie HttpOnly hardening deferred to Phase 2 (ADR-008)  

## Deploy notes

- Additive gateway/web/service image rebuild only  
- No migration required for Phase 1 code changes  
- Backup before VPS deploy; smoke `/api/v1/health`  

## Next gate

Complete `PHASE1_COMPLETION_AUDIT.md` sign-off before Phase 2.
