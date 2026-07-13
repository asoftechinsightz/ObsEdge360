# OpsEdge360 — Integration Readiness

**Document ID:** OE360-INTREADY-P2-001  
**Phase:** 2  
**Rule:** All access via **OpsEdge360 adapter layer**. No vendor UI dependency.

---

## Common adapter requirements

| Concern | Standard |
|---------|----------|
| Authentication | Per-tenant secrets in vault; service identity to engine |
| API endpoints | Mapped to canonical DTOs only |
| Events | Inbound webhooks → canonical bus events |
| Sync | Cursor/checkpoint stored per connector |
| Health | `GET` connector health in Admin; gateway probe |
| Upgrade | Document engine semver window; adapter compatibility matrix |
| Errors | Translated OpsEdge error codes |
| Recovery | Retry/backoff; last-good cache; DLQ for events |
| UI | Never deep-link to engine consoles for end users |

---

## 1. Apache SkyWalking

| Topic | Plan |
|-------|------|
| **Auth** | Token / TLS to OAP; optional gateway |
| **APIs** | GraphQL query; OTLP ingest path preferred long-term |
| **Events** | Alarm hooks → `alert.created` |
| **Sync** | On-demand traces/metrics; topology periodic |
| **Health** | OAP `/status` or GraphQL ping via adapter |
| **Upgrade** | Track OAP 10.x; pin tested `v10.4.x` |
| **Compatibility** | Java OAP + OTel collectors |
| **Errors** | Timeout → observe degraded banner |
| **Recovery** | Fail soft with `asOf`; no UI crash |
| **MVP mode** | Live lab **or** fixture replay for demos |

---

## 2. Wazuh

| Topic | Plan |
|-------|------|
| **Auth** | API user JWT (`:55000`) |
| **APIs** | Findings, agents, SCA, vuln subsets of OpenAPI |
| **Events** | Integrator/webhook → `threat.detected` / `finding.opened` |
| **Sync** | Incremental alerts + agent inventory |
| **Health** | Auth + manager status endpoints |
| **Upgrade** | Pin `4.14.x`; test before `5.x` |
| **Compatibility** | Manager + indexer optional for MVP fixtures |
| **Errors** | Map 401/5xx to connector status |
| **Recovery** | Re-enroll docs; queue replay |
| **License note** | GPL-2.0 — integrate, don’t embed modified core |
| **MVP mode** | Security Workspace fed by adapter or seed findings |

---

## 3. GLPI

| Topic | Plan |
|-------|------|
| **Auth** | API tokens / OAuth2 |
| **APIs** | HL REST/GraphQL for tickets & assets |
| **Events** | Webhooks → incident/CI upsert |
| **Sync** | Assets → CMDB external_refs; tickets optional |
| **Health** | API ping |
| **Upgrade** | Track 11.x |
| **Errors** | Conflict policy with native CMDB |
| **Recovery** | Resync job |
| **MVP** | Optional; native Incident Workspace primary |

---

## 4. NetBox

| Topic | Plan |
|-------|------|
| **Auth** | API token |
| **APIs** | REST/GraphQL DCIM/IPAM read |
| **Events** | Event rules webhooks → `ci.upserted` |
| **Sync** | Sites/devices/prefixes → CI kinds |
| **Health** | `/api/status/` style ping |
| **Upgrade** | Pin `4.6.x` tested |
| **Errors** | Partial sync OK |
| **Recovery** | Full resync |
| **MVP** | Best-effort read sync; twin may rely on CMDB/EDE |

---

## 5. n8n

| Topic | Plan |
|-------|------|
| **Auth** | API key; respect Sustainable Use / EE terms |
| **APIs** | Workflow trigger + execution status |
| **Events** | Completion webhook → `automation.completed` |
| **Sync** | Catalog list of allowed workflows |
| **Health** | API ping |
| **Upgrade** | Pin tested 2.29.x; review breaking changes |
| **Errors** | Failed run → incident comment |
| **Recovery** | Idempotent trigger keys |
| **UI** | OpsEdge Automation center only |
| **MVP** | Dry-run / sandbox workflow |

---

## 6. Ansible

| Topic | Plan |
|-------|------|
| **Auth** | SSH/WinRM creds in vault **or** AWX token |
| **APIs** | ansible-runner / AWX job API (preferred for audit) |
| **Events** | Job start/complete → automation events |
| **Sync** | Inventory subset from CMDB |
| **Health** | Runner reachability |
| **Upgrade** | ansible-core 2.21.x window |
| **Errors** | Play failure captured in run log |
| **Recovery** | Re-run with change ticket link |
| **MVP** | Dry-run playbook (check mode) against lab hosts or mock |

---

## Compatibility matrix (initial)

| Adapter | Min engine | Max tested | MVP required |
|---------|------------|------------|--------------|
| SkyWalking | 10.2 | 10.4 | Yes (or fixtures) |
| Wazuh | 4.12 | 4.14 | Yes (or fixtures) |
| GLPI | 11.0 | 11.0 | Optional |
| NetBox | 4.4 | 4.6 | Optional |
| n8n | 1.x/2.x SUL | 2.29 | Yes (or mock) |
| Ansible | 2.15 | 2.21 | Yes (or mock) |

---

## Implementation guardrail

CI check (future): fail build if `apps/web` imports engine URLs or brands.
