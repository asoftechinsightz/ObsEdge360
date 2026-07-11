# Release Notes — v0.9.3-wave3

**Production SHA:** `2c4815f8fb86328ad62d34f760c45802005ed3d0`  
**Date:** 2026-07-11

Discovery & CMDB Depth: persisted discovery jobs/runs/results/targets, expanded providers (Docker, database, middleware + existing connectors), secrets-backed credentials, relationship inference, topology materialization, configuration history and drift detection, enterprise Discovery Ops and Drift UI, migration **024**. Validated (`P3_WAVE3_VALIDATION_OK`, 16/16).

## Known limitations

- Cloud providers (AWS/Azure/GCP): authentication abstraction and interfaces are production-ready; full inventory collectors land with Wave 4+ topology/cloud depth  
- VMware/SNMP/WinRM depth depends on live credentials and network reachability per tenant connector  
- Topology layout/blast-radius UX polish and live dependency from traces are Wave 4 scope  
- Horizontal discovery worker scaling is supported via parallel job workers; dedicated worker fleet autoscaling is operational follow-up
