# High-Level Design (HLD) v1.0

**Document ID:** OE360-HLD-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

---

## 1. System context

```text
[Operators / Admins] → HTTPS → Nginx
                              ├─ Web (Next.js)
                              └─ API Gateway (NestJS) → Core services → PostgreSQL / Redis / Kafka
[Agents] → HTTPS → Gateway (X-Agent-Key routes) → Discovery / config APIs
```

External IdP/SSO and Vault are roadmap items (Phases 2–6), not required for v1.0 runtime.

## 2. Key capabilities (platform)

| Domain | Capability |
|--------|------------|
| Discovery | Asset/service discovery; agent config surfaces |
| CMDB | Configuration items; topology (wired Phase 1) |
| Observability | Telemetry/pipeline sources (wired Phase 1) |
| Transactions | Transaction monitoring services |
| Security | Security service + future enforcement at gateway |
| Compliance | Rule evaluation engine (deepening Phase 2+) |
| Web | Operator console; pack-gated Banking360 nav |

## 3. Cross-cutting concerns

| Concern | HLD approach |
|---------|--------------|
| API | Versioned `/api/v1` via gateway |
| AuthN | JWT; agent key for selected routes |
| AuthZ | Phase 2 RBAC/ABAC at gateway |
| Multi-tenancy | tenant_id; hard isolation Phase 2 |
| Observability of platform | health/ready/live/version/metrics |
| Extensibility | Packs + plugins (ADR-020/024/025) |

## 4. Quality attributes

| Attribute | Target posture |
|-----------|----------------|
| Security | Baseline + Phase 2 spine |
| Reliability | Compose restart recovery; PRR gates |
| Performance | `PERFORMANCE_BASELINE.md` |
| Maintainability | Monorepo workspaces; ADRs; DoD |
| Portability | Compose now; Helm later |

## 5. Out of scope for HLD v1.0 detail

Full Studio, production LLM Copilot, multi-region active-active, and certified GRC automation — covered by later ADRs/phases without changing this frozen HLD file.

## Related

`ARCHITECTURE_BASELINE_v1.0.md` · `LLD_v1.0.md` · `docs/governance/FROZEN_ARCHITECTURE.md`  
