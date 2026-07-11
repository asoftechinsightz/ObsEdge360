# Wave 9 — Quick Start

1. Obtain `v1.0.0` package or tag.
2. Configure `.env` from `config/env.sample` (never use sample values in production).
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d`
4. Run migrations; smoke `/api/v1/health`.
5. Login to web Admin; confirm GA overview `/admin/system/ga`.
