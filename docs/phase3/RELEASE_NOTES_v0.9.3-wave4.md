# Release Notes — v0.9.3-wave4

**Production SHA:** `fb24bc5e202e5c7fbb0293fbfe3e3427062faf76`  
**Date:** 2026-07-11

Live operational topology: span-derived service dependencies into CMDB, interactive layout engine with persisted positions, blast-radius caching with layer impact, live topology event cursor, multi-layer Topology UI, migration **025**. Validated (`P3_WAVE4_VALIDATION_OK`, 15/15).

## Known limitations

- Trace sync creates service CIs when spans reference unknown services; naming alignment with discovery CIs may require attribute mapping  
- SSE `/topology/live` is available on CMDB; UI currently polls `/topology/events` through the gateway for reliability  
- Neo4j remains optional enrichment — Postgres adjacency is the production blast-radius source of truth
