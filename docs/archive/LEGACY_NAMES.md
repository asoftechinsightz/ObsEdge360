<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Legacy Names Archive

Names retained intentionally for production compatibility.

| Legacy | Current context | Reason |
|--------|-----------------|--------|
| Observability360 | VPS path /opt/observability360, domain | Locked domain decision |
| Trinetra360 | POSTGRES_DB, Helm chart, OpenAPI file | DB/volume compatibility |
| trinetra | POSTGRES_USER default | Existing prod data |
| obs360_* | nginx upstream names | Internal only |
| MainStay_Vizor | Old folder name | Historical repo path |
| @trinetra360/* | Prior npm scope | Replaced by @opsedge360/* |

Do not rename production DB, domain, or Docker volumes without explicit migration plan.
