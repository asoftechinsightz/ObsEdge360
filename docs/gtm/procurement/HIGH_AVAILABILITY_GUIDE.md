# High Availability Guide

## Compose HA

- Overlay: `docker-compose.ha.yml`  
- Goals: process restart resilience, replicated where configured  
- Validate with customer chaos expectations (Wave7 HA docs as reference)

## Kubernetes

- Helm values: `values-ha.yaml` / `values-production.yaml`  
- PDB / HPA templates for gateway/web  
- Full microservice HA on K8s may still require Compose parity planning (known limitation)

## Data plane

- Postgres: customer-managed HA (primary/replica, backups) recommended for production  
- Redis: cache/session meta — define durability expectations per SOW  
- Kafka: optional; size retention with ops  

## Failover drill

Quarterly: backup → restore on clone (`docs/commercial/DISASTER_RECOVERY.md`).

## References

`docs/Wave7/HighAvailability.md`, commercial DR guide.
