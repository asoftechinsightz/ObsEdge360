# Architecture Guide — RC1

Unchanged core: Nest API gateway → Express microservices + FastAPI agents; Postgres; Redis; Kafka; Neo4j.

Phase 4 adds productization planes:

- Commercial subscriptions / entitlements
- MFA policies + factors
- Demo tours
- RC1 readiness attestation
- API access tokens

No breaking `/api/v1` changes.
