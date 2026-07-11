# Dashboards API (Wave 6)

Base: `/api/v1/dashboards`

| Method | Path |
|--------|------|
| GET | `/catalog` |
| GET | `/` |
| POST | `/` |
| POST | `/default` |
| GET | `/:id` |
| PATCH | `/:id` |
| DELETE | `/:id` |
| GET | `/:id/data` |
| POST | `/:id/widgets` |
| PATCH | `/:id/widgets/:widgetId` |
| DELETE | `/:id/widgets/:widgetId` |
| PUT | `/:id/layout` |
| POST | `/:id/shares` |

Auth: JWT + tenant isolation.
