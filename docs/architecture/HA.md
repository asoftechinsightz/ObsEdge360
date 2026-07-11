# High Availability

**Phase:** 5  
**Wave 1 posture:** Single-replica production baseline with active-passive DR via backup restore.

## Current production (validated)

- Stateless services behind Nginx  
- PostgreSQL primary (local bind)  
- Redis + Kafka present on VPS stack  
- Gateway health/ready/live probes

See also `docs/HA-RUNBOOK.md`.

## Target GA HA (Waves 2 / 9)

- API Gateway N≥2 + rolling restart  
- Postgres HA (primary/standby)  
- Redis Sentinel  
- Kafka cluster  
- Nginx HA  
- Automatic failover drills + chaos tests

## Wave 1 Admin Center

`GET /api/v1/admin/health/cluster` reports `haValidated: false` until HA wave closes.
