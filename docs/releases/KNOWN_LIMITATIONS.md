# Known Limitations — v1.0.0 / Phase 2

1. Production Compose DB may still use historical name `trinetra360`; logical name is `opsedge360_prod` (documented alias).
2. Demo postgres is a separate compose service (`postgres-demo`); production VPS must not point `APP_ENV=demo` at the prod DB.
3. Browser synthetics (Phase B) are feature-flagged off (`synthetics.browser=false`).
4. Full ITSM (CAB depth, service catalog UX) is foundation schema + summary API only.
5. Industry packs beyond Banking360 are framework rows (`planned`), not full solutions.
6. Full-scale load / 24h soak remain operator-gated (`CERT_FULL_SCALE` / soak seconds).
7. Destructive chaos remains operator-gated.
8. Helm chart focuses on gateway/web; full microservice K8s parity is incomplete.
9. Cloud KMS secret providers remain stubbed behind the secrets interface.
10. MFA is not yet implemented.
