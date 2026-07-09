# OpsEdge360 — Testing Strategy

**Version:** 1.0

---

## 1. Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  Playwright (critical paths)
       ┌┴─────────┴┐
       │ Integration│  API + DB + Kafka
      ┌┴───────────┴┐
      │  Unit Tests  │  Jest (TS), pytest (Python)
      └─────────────┘
```

## 2. Unit Tests

| Layer | Framework | Coverage Target |
|-------|-----------|-----------------|
| NestJS services | Jest | 80% |
| Next.js components | Jest + RTL | 70% |
| AI agents | pytest | 75% |
| Shared types | Jest | 90% |

## 3. Integration Tests

- API contract tests against OpenAPI spec
- Database migration tests (testcontainers PostgreSQL)
- Kafka event flow: discovery → cmdb → twin sync
- Connector mock tests (SSH, SNMP simulators)

## 4. End-to-End Tests

Playwright scenarios:
1. Login → Executive dashboard loads KPIs
2. CMDB search → CI detail → relationship graph
3. Digital twin renders and updates on WebSocket event
4. Compliance dashboard shows framework score
5. Agent approval workflow (mock)

## 5. Performance Tests

- k6 load tests on API Gateway (1000 RPS read)
- Telemetry ingestion burst (100K events/min)
- Neo4j graph query under 10K nodes

## 6. Security Tests

- OWASP ZAP automated scan in CI
- Dependency vulnerability scan (Trivy, npm audit)
- RBAC authorization matrix tests
- Tenant isolation verification

## 7. OT Safety Tests

- Connector rate limit enforcement
- Read-only mode prevents write operations
- OT zone approval gate tests

## 8. CI Integration

See `.github/workflows/ci-cd.yml`:
- Lint → Unit → Integration → E2E (staging) → Security scan

## 9. Test Data

- Seed script: `database/seeds/demo-enterprise.sql`
- Demo tenant with 50 CIs, 5 services, sample transactions

## 10. Acceptance Criteria

Platform release requires:
- All P0 E2E tests pass
- No critical/high security findings
- Performance NFRs met in staging
- 80%+ unit coverage on core services
