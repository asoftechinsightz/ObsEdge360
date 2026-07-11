# High Availability

**Phase:** 5  
**Wave 2 posture:** HA foundation validated (`v1.0.0-wave2`). Live multi-node is operator-enabled.

See authoritative doc: [HIGH_AVAILABILITY.md](./HIGH_AVAILABILITY.md)

## Current production

- Stateless services behind Nginx  
- PostgreSQL primary (streaming replica ready when attached)  
- Redis (+ Sentinel config available)  
- Kafka (multi-broker guidance when KAFKA_BROKERS set)  
- Admin cluster health via `/api/v1/admin/ha` and `/api/v1/admin/cluster`

## Remaining for GA (Waves 8–9)

Full multi-AZ drills, chaos tests, and `P5_GA_VALIDATION_OK`.
