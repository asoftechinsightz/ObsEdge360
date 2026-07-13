# Sprint 3 — Known Issues

| ID | Severity | Issue | Workaround / Plan |
|----|----------|-------|-------------------|
| S3-KI1 | Medium | Health snapshots are on-demand (blast/history), not continuous CI health hooks | Call snapshot after blast; Sprint 4 continuous propagation |
| S3-KI2 | Medium | Time travel is health-history MVP — full relationship/config rewind not in UI | `asOf` on enterprise graph relationships; expand in later sprint |
| S3-KI3 | Low | Technical/ops owner user links need migration columns; EDE may leave some Unassigned until users exist | Seed maps owners via `owner_id` + team strings |
| S3-KI4 | Low | CMDB blast proxy may empty → Postgres fallback used | Expected; still returns actionable radius |
| S3-KI5 | Info | RC3 production gates not yet executed | Run deploy + migrate + EDE reload + validation pack |

## Non-goals (unchanged)

- Observability UI rewrite (Sprint 2 frozen)  
- Architecture changes without ADR  
- Vendor UI embedding  
