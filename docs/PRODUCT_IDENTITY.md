# OpsEdge360 — Product Identity

**Product name:** OpsEdge360  
**Codename / repo:** OpsEdge360 (internal monorepo name)  
**Version:** 1.0.0 (GA)  
**Date:** 4 July 2026

---

## Positioning

OpsEdge360 is a **standalone product** in the AsoftechInsightz portfolio. It delivers unified IT, OT, network, cloud, security, transaction, and compliance observability with AI-assisted operations.

It is **not** a module inside LeadEdge360 or RetailEdge360.

---

## Product boundary (hard rules)

| Rule | Detail |
|------|--------|
| **Separate codebase** | All feature code lives in `OpsEdge360` — not in `asoftech-insightz` |
| **Separate UI** | Next.js app at `apps/web` — no `/observability360` routes in Business Suite |
| **Separate API** | NestJS gateway at `apps/api-gateway` — no Suite proxy layer |
| **Separate data** | PostgreSQL + optional Neo4j/Redis/Kafka — no MongoDB CRM dependency |
| **Separate deploy** | Own Docker stack, domain, SSL, backups |
| **Separate auth** | Gateway JWT + `tenant_id` — independent user/org store (SSO optional later) |
| **No product switcher merge** | LeadEdge/Retail switcher stays two-product only |

---

## Sibling products (marketing only)

LeadEdge360 and RetailEdge360 may link to OpsEdge360 from marketing pages (`/products/observability360`) as an **external product** — same as linking to a third-party SaaS.

---

## Internal naming

| Layer | Name |
|-------|------|
| Customer-facing | OpsEdge360 |
| npm workspaces | `@opsedge360/*` (legacy internal scope — rename in a future sprint) |
| AI engine codename | Trinetra (agents, event bus) |

---

## Industry packs (within OpsEdge360)

Industry capabilities are **optional Solution Packs** (see `docs/governance/INDUSTRY_SOLUTION_PACKS.md`). The core platform is industry-agnostic.

- **Banking360** — Optional BFSI pack (nav gated by `NEXT_PUBLIC_PACK_BANKING360_ENABLED`, default `true`)
- **Retail360** — Planned optional pack
- **Manufacturing360**, **Healthcare360** — Planned optional packs

Core discovery, CMDB, observability, and compliance **engine** must run with all packs disabled.
---

## Deployment modes

Configured via `packages/platform-config`:

- `DEPLOYMENT_MODE=saas` — multi-tenant cloud
- `DEPLOYMENT_MODE=hybrid` — control plane cloud, data plane on-prem
- `DEPLOYMENT_MODE=onprem` — full on-premises

See [DEPLOYMENT-TOPOLOGY.md](./DEPLOYMENT-TOPOLOGY.md).

---

## Optional future integration (not merge)

If a customer uses both LeadEdge360 and OpsEdge360:

1. **SSO** — OIDC/SAML federation (same email, separate sessions)
2. **Webhook** — CRM events → observability alerts (one-way)
3. **Billing** — separate subscriptions in Stripe/Razorpay

No shared Mongo `orgId` bridge required for GA.
