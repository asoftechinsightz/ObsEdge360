# Phase 1 Development Rules (Binding)

**Status:** ACTIVE  
**Approved:** 2026-07-10  
**Scope:** Phase 1 only  

## Rules

1. **No breaking changes to production** — additive APIs only; preserve production locks (domains, `trinetra360`, Nginx/SSL, volumes, migrations 001–014).
2. **No database changes without migration scripts** — new numbered migrations only; never edit 001–014.
3. **Every new API must include OpenAPI documentation** — Nest `@ApiOperation` / `@ApiTags` and update `openapi/` or Swagger surface.
4. **Every service must expose** `/health`, `/ready`, `/live`, `/version`, `/metrics`.
5. **Every change must include** unit, integration, and regression tests (as applicable to the change).
6. **Preserve backward compatibility** wherever practical.
7. **Update architecture and technical documentation after each completed milestone.**
8. **Keep the platform deployable and runnable after every milestone.**

## ADR decisions locked

- ADR-001 … ADR-008: **Accepted**
- ADR-003: **Option B** — scheduler & config-management remain experimental / non-prod in Phase 1

## Phase gate

After Phase 1 exit criteria are met, run **Phase 1 Completion Audit** before any Phase 2 work.
