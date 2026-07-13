# Sprint 3 — API Reference

Base: `/api/v1/twin`  
Auth: Bearer JWT · tenant-scoped

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/twin/graph?view=enterprise&serviceId=&limit=&asOf=` | Enterprise Digital Twin graph (BS + CIs + edges) |
| GET | `/twin/graph` | Legacy CI topology graph |
| GET | `/twin/business-services` | List modeled business services with KPIs/ownership/SLA |
| GET | `/twin/business-services/:id` | Service detail |
| GET | `/twin/business-services/:id/blast-radius?depth=&direction=` | Business blast radius |
| GET | `/twin/business-services/:id/history?hours=` | Health history (time-travel MVP) |
| POST | `/twin/business-services/:id/snapshot` | Record health propagation snapshot |
| GET | `/twin/executive-risk` | Executive risk dashboard payload |
| POST | `/twin/ai/explain` | Twin-grounded AI (`serviceId`, `name`, `prompt`) |
| GET | `/twin/blast-radius/:ciId` | CI blast radius |
| GET | `/twin/impact/:ciId` | CI impact analysis |

## Response vocabulary

Customer-facing fields use OpsEdge360 terms only: business service, health, blast radius, ownership, SLA. No engine vendor names.

## Performance targets

| Operation | Target |
|-----------|--------|
| Graph load | &lt; 2 s |
| Impact / blast | &lt; 500 ms |
| Relationship lookup | &lt; 200 ms |
| Business service page | &lt; 2 s |
