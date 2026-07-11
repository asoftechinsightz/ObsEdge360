# Capacity Management

## Capacity

`GET /api/v1/admin/capacity` probes database size and key table live tuples, stores `capacity_snapshots`, returns score + history.

## Storage

`GET /api/v1/admin/storage` tracks RAG/KG/backup counts into `storage_snapshots`.

## Platform health

`GET /api/v1/admin/platform-health` rolls up component, capacity, storage, security, license, and quota scores with recommendations.
