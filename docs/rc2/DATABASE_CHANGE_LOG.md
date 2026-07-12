# Database Change Log — RC2

## Migration 045 — `045_rc2_pilot_production_readiness.sql`

**Type:** Additive  
**Gate table:** `rc2_readiness`

### Objects

| Object | Change |
|--------|--------|
| `feature_flags` | Seed RC2 flags (`mfa.totp_rfc6238`, `mfa.backup_codes`, `security.login_history`, …) |
| `mfa_backup_codes` | New table — hashed backup codes |
| `login_history` | New table — security/login events |
| `users.password_changed_at` | New column |
| `users.password_must_rotate` | New column (boolean) |
| `demo_reset_runs` | New table — demo reset audit |
| `performance_benchmark_runs` | New table — modeled capacity runs |
| `rc2_readiness` | New table — gate approval |
| `api_access_tokens.rotated_from` | Column if missing (token lifecycle) |

### Apply

```bash
npm run db:migrate
# or on VPS: docker exec … node database/migrations/run.js
```

### Verify

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_name='rc2_readiness';
-- expect 1
SELECT column_name FROM information_schema.columns
 WHERE table_name='users' AND column_name IN ('password_must_rotate','password_changed_at');
```

### Rollback

Do **not** drop tables in pilot environments. App rollback to RC1 SHA `ac6c6ba` is safe while leaving 045 forward (unused tables are inert). See [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md).

---

## Migration 046 — `046_rc2_mfa_login_challenge.sql`

**Type:** Additive constraint update  
**Purpose:** Allow `mfa_challenge` events in `login_history`.

### Apply / verify

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='login_history_event_chk';
-- must include mfa_challenge
```

### Rollback

Re-apply previous CHECK without `mfa_challenge` only if required (not recommended after production traffic).

---

## Compatibility

- No destructive column drops.  
- Historical DB name `trinetra360` remains a production alias; product brand is OpsEdge360.
