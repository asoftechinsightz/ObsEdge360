# Rollback Plan — RC2

1. Snapshot DB + `.env` before upgrade.
2. Redeploy previous validated SHA: RC1 `ac6c6ba58ef72b16e24d93a4be30215795577c97` (docs tip `82a91c8`).
3. Keep migration 045 tables (additive); do not DROP unless approved.
4. Recreate api-gateway + web + nginx.
5. Verify `/health` and RC1 `/about`.
6. Communicate pilot pause if mid-session.
