# Database Change Log — RC2

**Migration:** `045_rc2_pilot_production_readiness.sql`  
**Gate table:** `rc2_readiness`

| Table | Notes |
|-------|-------|
| `mfa_backup_codes` | New |
| `login_history` | New |
| `demo_reset_runs` | New |
| `performance_benchmark_runs` | New |
| `rc2_readiness` | New / gate |
| `security_alerts` | **Reuses** Wave security observability (020) — RC2 writes `title/severity/summary` |

### Altered
- `users.password_changed_at`, `users.password_must_rotate`
- `api_access_tokens.rotated_from`, `api_access_tokens.note`

Additive / backward compatible.
