# Integration API

Base: `/api/v1/integrations`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Dashboard |
| GET/POST | `/connectors` | List / register |
| GET | `/connectors/catalog` | Catalog |
| PATCH | `/connectors/:id` | Update / enable |
| POST | `/test` | Test connection |
| GET | `/health` | Health snapshots |
| POST | `/itsm` | ServiceNow/Jira actions |
| GET/POST | `/notifications` | Channels |
| POST | `/notifications/deliver` | Deliver |
| GET | `/notifications/deliveries` | History |
| GET/POST | `/identity` | Identity providers |
| POST | `/identity/ldap/login` | LDAP auth + JIT |
| GET/POST | `/sync` | Sync jobs |
| POST | `/secrets/validate` | Secret ref check |
| GET | `/audit` | Connector audit |

All require JWT + RBAC + tenant isolation.
