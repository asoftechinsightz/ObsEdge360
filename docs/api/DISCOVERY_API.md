# Discovery API (Wave 3)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/discovery/providers` | Protocols + providers |
| GET/POST | `/api/v1/discovery/jobs` | Job CRUD (create/list) |
| POST | `/api/v1/discovery/jobs/:id/run` | Execute job |
| POST | `/api/v1/discovery/run` | On-demand connector run |
| GET | `/api/v1/discovery/runs` | Run history |
| GET | `/api/v1/discovery/results?runId=` | Run results |
| GET/POST | `/api/v1/discovery/targets` | Targets |
| GET | `/api/v1/cmdb/assets` | Asset inventory |
| GET | `/api/v1/cmdb/drift` | Drift events |
| GET | `/api/v1/cmdb/history?ciId=` | CI history |
| GET/POST | `/api/v1/cmdb/topology/:type[/refresh]` | Topology |
