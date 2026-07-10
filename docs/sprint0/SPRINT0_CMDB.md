# Sprint 0 CMDB Foundation

## Enterprise CI Model

Existing `configuration_items` table supports all CI types from `@opsedge360/shared-types`:
server, vm, container, pod, database, application, service, network_device, firewall, load_balancer, ot_device, cloud_resource, api, queue, cache, and more.

## Sprint 0 Extensions

### Configuration History
- Table: `ci_config_history`
- Versioned attribute snapshots with checksum
- Change type tracking (update, discovery, manual)

### Configuration Drift
- Table: `ci_config_drift`
- Expected vs actual checksum comparison
- Severity classification
- Resolution tracking via `resolved_at`

### Relationship Engine
Existing `ci_relationships` with types: depends_on, runs_on, connects_to, owned_by, part_of, secures, monitors, calls

### Business Services
Discovered via `business-service` connector using CMDB tags.

## API

Existing CMDB APIs unchanged. New drift detection via config-management service:

`POST /config-management/drift/detect`

## Lifecycle

CI status flow: discovered → active → maintenance → decommissioned

## CI Versioning

`ci_config_history.version` increments per CI on each tracked change.
