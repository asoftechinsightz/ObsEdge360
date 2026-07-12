# Upgrade & Rollback Guide — RC1

## Upgrade

1. Snapshot DB + `.env`
2. Deploy new tip / tag
3. Run migrations (additive 044+)
4. Recreate gateway/web
5. Run validation script

## Rollback

1. Redeploy previous SHA (Phase 3 `be66dcd` / docs tip `3b37e46`)
2. Do not drop 044 tables unless approved
3. Restore DB dump only if schema forward-incompatible (should not be required)
