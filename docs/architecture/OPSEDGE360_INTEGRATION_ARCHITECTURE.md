# OpsEdge360 — Integration Architecture

**Document ID:** OE360-INT-P1-001  
**Phase:** 1  
**Inputs:** Phase 0 foundation recommendation  
**Rule:** UI never binds directly to external systems.

---

## 1. Abstraction mandate

```text
Customer UI  →  OpsEdge Gateway Contracts  →  Domain Services  →  Adapter SPI  →  Engine
```

Engines are **implementation details**. Swapping SkyWalking for another OTel backend must not rewrite screens.

---

## 2. Adapter SPI (conceptual)

Each adapter implements:

| Method | Purpose |
|--------|---------|
| `health()` | Connectivity / license / version |
| `capabilities()` | Feature flags supported |
| `sync(cursor)` | Pull incremental state |
| `query(request)` | On-demand read (mapped to OpsEdge DTO) |
| `execute(command)` | Gated write (automation, ticket update) |
| `subscribe(events)` | Push/webhook into OpsEdge event bus |

DTOs are **canonical OpsEdge models** (see Data Model doc).

---

## 3. Engine adapters

| Adapter | Engine | Primary domain DTOs |
|---------|--------|---------------------|
| `ObserveAdapter` | Apache SkyWalking | Trace, MetricSeries, ServiceTopology, LogHit |
| `SecurityAdapter` | Wazuh | Finding, Agent, FimEvent, Vuln, ScaResult |
| `ItsmAdapter` | GLPI (default) | Ticket, Asset, KnowledgeArticle |
| `NetworkSotAdapter` | NetBox | Site, Device, Prefix, Cable, Circuit |
| `WorkflowAdapter` | n8n | WorkflowDefinition, WorkflowRun |
| `RemediationAdapter` | Ansible (+ optional AWX) | Playbook, JobRun, Inventory |

Optional: `ItsmAdapter` → iTop (license diligence).

---

## 4. Mapping & reconciliation

| Concern | Approach |
|---------|----------|
| Identity | OpsEdge UUID canonical; external IDs in `external_refs` |
| Conflict | Precedence policy per field (CMDB wins structure; observe wins health signals) |
| Deletion | Soft-delete + tombstone events |
| Clock skew | Store engine timestamps + ingest timestamps |

---

## 5. Credential & tenancy

- Per-tenant connector configs in vault  
- Admin UI: Connectors page (OpsEdge branded)  
- Secrets never returned to UI  
- Connector test action emits audit  

---

## 6. Failure UX

| Condition | User sees |
|-----------|-----------|
| Engine down | “Observability data temporarily unavailable” + last good `asOf` |
| Partial | Degraded banner on widgets |
| Auth fail | Admin-only connector error detail |

Never show upstream product names or stack traces to standard users.

---

## 7. Sync patterns

| Pattern | Use |
|---------|-----|
| Webhook in | Wazuh alerts, NetBox events, n8n completion |
| Poll / cursor | Inventories, tickets |
| Stream | Future OTLP direct into OpsEdge collector (still via observe domain) |
| On-demand | Trace waterfall fetch |

---

## 8. Future plug-and-play

New monitoring/security/ITSM tools = **new adapter package** registering into Plugin Framework — no core fork.

See [OPSEDGE360_PLUGIN_FRAMEWORK.md](./OPSEDGE360_PLUGIN_FRAMEWORK.md).

---

## 9. Phase 0 alignment

Integrate, don’t replace: SkyWalking, Wazuh, GLPI, NetBox, n8n, Ansible — as documented in `workspace/research/comparison/OPSEDGE360_FOUNDATION_RECOMMENDATION.md`.
