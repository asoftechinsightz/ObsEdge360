# Universal Agent API

Base: `/api/v1/ua`

## Console (JWT + discovery:read/write)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/summary` | Fleet KPIs |
| GET | `/agents` | List (q, platform, status, limit, offset) |
| GET | `/agents/:id` | Detail |
| POST | `/agents/register` | Register + return agentKey once |
| POST | `/bootstrap-tokens` | Enrollment token |
| PUT | `/agents/:id/config` | Push remote config |
| GET | `/agents/:id/health` | Latest health |
| POST | `/agents/bulk-status` | Bulk status update |

## Agent (X-Agent-Key)

| Method | Path |
|--------|------|
| POST | `/enroll` (bootstrap token, public) |
| POST | `/agents/:id/heartbeat` |
| POST | `/agents/:id/inventory` |
| GET | `/agents/:id/config` |
| POST | `/agents/:id/plugins` |
| GET | `/agents/:id/updates` |
| POST | `/agents/:id/telemetry/{metrics,logs,traces}` |
