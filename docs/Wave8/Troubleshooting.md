# Wave 8 — Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| API 502 | nginx upstream / gateway restarting | Recreate `api-gateway` + `nginx`; wait for healthy |
| Migrate stuck | Postgres not ready | `pg_isready`; retry migrate |
| Login fails | JWT/secret drift after restore | Restore matching `.env` |
| OpenAPI empty | `SWAGGER_ENABLED=false` | Enable Swagger for RC packaging export |
| Air-gap verify fail | checksum mismatch | Re-transfer archive + `.sha256` |

Cross-ref: Wave 6 Runbook, Wave 7 Chaos/HA docs.
