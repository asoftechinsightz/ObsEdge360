# OpsEdge360 — Enterprise APIs

**Document ID:** OE360-API-P1-001  
**Phase:** 1

---

## 1. API surfaces

| Surface | Audience | Base |
|---------|----------|------|
| **Public API** | Customers / integrators | `/api/v1` |
| **Internal API** | Service-to-service | mesh mTLS, not internet |
| **Admin API** | Tenant/platform admin | `/api/v1/admin` |
| **Webhook ingress** | Engine/partner callbacks | `/api/v1/hooks/{connector}` |
| **SDK** | Official clients (TS/Python future) | wraps Public API |
| **GraphQL** | Future BFF for complex twin queries | `/graphql` (planned) |

All customer-facing contracts are **OpsEdge360** — never engine native APIs.

---

## 2. Authentication

| Method | Use |
|--------|-----|
| Bearer JWT (OIDC) | Interactive / user automation |
| API keys | Machine integrations |
| mTLS | Partner / private link |
| Signed webhooks | Ingress authenticity |

---

## 3. Versioning

- URI versioning: `/api/v1`, `/api/v2`  
- Deprecation policy: notice ≥ 1 major cycle  
- Additive changes preferred in minor  

---

## 4. Rate limiting & quotas

| Dimension | Enforcement |
|-----------|-------------|
| Per API key | Gateway token bucket |
| Per tenant | Fair share + burst |
| Expensive ops | Separate quotas (report gen, twin sim, AI) |

429 with `Retry-After`; audited when abused.

---

## 5. Public API domains (v1 sketch)

| Domain | Examples |
|--------|----------|
| Auth / session | `/auth`, `/me` |
| Search | `/search` |
| Dashboard | `/dashboard/executive` |
| Twin | `/twin/graph`, `/twin/impact` |
| CMDB | `/cmdb/cis`, `/cmdb/relationships` |
| Observe | `/observe/metrics`, `/observe/traces`, `/observe/logs` |
| Security | `/security/findings`, `/security/posture` |
| Incidents | `/ops-intelligence/incidents/...` |
| Automation | `/automation/runs`, `/automation/approve` |
| Reports | `/reports` |
| Audit | `/audit/events` |
| Webhooks mgmt | `/webhooks` outbound subscriptions |

Exact paths evolve; **contracts freeze via OpenAPI** before external GA.

---

## 6. Webhook framework (outbound)

Customers subscribe to domain events:

- HTTPS POST with signature header  
- At-least-once delivery + retry/backoff  
- Payload = canonical event envelope  

Inbound engine webhooks terminate at gateway → adapter → canonical events.

---

## 7. Errors

Standard problem shape:

```json
{
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Human readable",
    "requestId": "uuid",
    "details": {}
  }
}
```

No upstream engine error bodies leaked.

---

## 8. SDK principles

- Typed clients generated from OpenAPI  
- Pagination helpers  
- Idempotency key support on writes  
- Official examples for incident create, twin impact, automation request  

---

## 9. Future GraphQL

Use for Twin/neighborhood queries where REST chatty; same AuthZ middleware; not a second security model.
