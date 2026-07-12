# Database Change Log — RC2

**Migration:** `045_rc2_pilot_production_readiness.sql`  
**Gate table:** `rc2_readiness`

### Added tables
- `mfa_backup_codes`
- `login_history`
- `security_alerts`
- `demo_reset_runs`
- `performance_benchmark_runs`
- `rc2_readiness`

### Altered
- `users.password_changed_at`, `users.password_must_rotate`
- `api_access_tokens.rotated_from`, `api_access_tokens.note`

Additive / backward compatible.
