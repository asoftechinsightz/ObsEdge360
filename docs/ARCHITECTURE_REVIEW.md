<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Architecture Review — OpsEdge360

## Pattern

Modular monorepo with NestJS API gateway (BFF), Express microservices, shared packages (`shared-db`, `event-bus`, `cache`, `platform-config`, `shared-types`), PostgreSQL as system of record.

## Request flow

```
Browser → nginx → web (Next.js) → api-gateway → microservice → PostgreSQL/Redis/Kafka
```

## Deployment modes

`DEPLOYMENT_MODE`: saas | hybrid | onprem  
`PERFORMANCE_PROFILE`: local | standard | high (pool sizing)

## Gaps

- 4 microservices not in prod compose
- Neo4j/OpenSearch/Mongo optional, often disabled in prod
- No service mesh / mTLS
