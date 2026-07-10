# Scheduler Service — EXPERIMENTAL

**ADR-003 Option B (Accepted):** This service is **not** part of the production Docker Compose stack and is **not** proxied by the API gateway in Phase 1.

| Item | Value |
|------|-------|
| Port | 4011 |
| Status | Experimental / lab |
| Prod compose | Not included |
| Gateway routes | Not exposed |

Use for local development only:

```bash
npm run build -w @opsedge360/scheduler
npm run dev -w @opsedge360/scheduler
```

Promotion to production requires a new ADR amending ADR-003.
