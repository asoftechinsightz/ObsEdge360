# Rollback Plan — RC3

## Targets

| Target | SHA |
|--------|-----|
| RC2 validated code | `a2d7e44ec25dbd2eb9ae11255282d6b60f086f6f` |
| RC1 | `ac6c6ba58ef72b16e24d93a4be30215795577c97` |

## Steps

1. Backup Postgres.  
2. `git checkout <target-sha>` + rebuild compose/helm.  
3. **Do not** reverse migrations 045–047.  
4. Smoke health + login.  

Pre-RC3 tokens lack `jti` — they continue to work after rollback. Post-RC3 encrypted MFA secrets require `SECRETS_MASTER_KEY` continuity if staying on encrypted rows while rolling app back — prefer forward-fix RC3 app if MFA already enrolled with envelopes.
