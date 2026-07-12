# Database Validation — RC3

## Migration 047 — `047_rc3_epp_security_hardening.sql`

| Change | Type |
|--------|------|
| `user_sessions.jti` + indexes | Additive |
| `mfa_factors.secret_key_id`, `secret_alg` | Additive |
| `rc3_readiness` | New gate table |
| Feature flags | Seed |

### Verify

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rc3_readiness';
SELECT column_name FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='jti';
```

### Rollback

Keep forward. App may roll back; do not drop columns in pilot DBs.
