# Topology API (Wave 4)

Base: `/api/v1/cmdb`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/topology/layers` | Layer catalog + counts |
| GET | `/topology/dependencies` | Inferred deps |
| GET | `/topology/events?afterId=` | Live cursor |
| POST | `/topology/sync-traces` | Body `{ hours?: number }` |
| GET | `/topology/:type` | Snapshot |
| POST | `/topology/:type/refresh` | Rebuild |
| POST | `/topology/:type/layout` | Body `{ algorithm }` |
| GET | `/twin/blast-radius/:ciId` | Cached blast analysis |

Auth: JWT + tenant isolation. Existing Wave 3 topology routes remain unchanged.
