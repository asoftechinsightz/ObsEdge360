# SDS-3.3 — Discovery & CMDB Depth

**Document ID:** OE360-SDS-3.3  
**Wave:** Phase 3 / Wave 3  
**Release:** `v0.9.3`  
**Status:** ✅ CLOSED — production validated (`v0.9.3-wave3`)  

## Objectives

Enterprise discovery job engine with persisted runs/results, expanded providers (docker/database/middleware + existing), secrets-backed credentials, CMDB relationship inference, configuration history/drift, and normalized topology nodes/edges — without breaking existing discovery/CMDB APIs.

## Migration

**024** — `discovery_jobs|runs|targets|results`, `topology_nodes|edges`, `configuration_history`, `drift_events`, CI/relationship enum extensions, `ci_relationships` view.

## Acceptance

P3_WAVE3_VALIDATION_OK in production.
