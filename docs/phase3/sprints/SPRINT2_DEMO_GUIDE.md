# Sprint 2 — Demo Guide

## Goal

Tell a complete operational story without empty dashboards and without leaving OpsEdge360.

## Packs covered

| Pack | Story anchors |
|------|----------------|
| Banking360 | UPI Payments Fabric, CBS, Oracle RAC, Payments PostgreSQL |
| Retail360 | Checkout API, Retail Orders Aurora |
| Cloud Native | Order Orchestrator |
| Kubernetes | EKS Mumbai payments, payments-ns, upi-gateway deployment |
| Hybrid Infrastructure | App/DB hosts, DR VM, cloud instance |

## Setup

1. Enter demo: `POST /api/v1/demo/ede/enter` (or Guided Evaluation).  
2. Telemetry seed runs automatically; or call `POST /api/v1/observe/demo/seed`.  
3. Open `/observability`.

## Talk track (8–10 minutes)

1. **Overview** — “UPI is degraded; revenue path at risk.”  
2. **Applications** — Select UPI → business impact → Twin.  
3. **Kubernetes / Containers** — Show unavailable replicas / OOM container.  
4. **Logs** — Filter ERROR · upi-gateway.  
5. **Traces** — Open slow ERROR waterfall (settlement timeout).  
6. **Metrics** — Business `upi.success_rate` + infra CPU.  
7. **Topology** — Click UPI → Twin impact → business mapping.  
8. **AI** — “Explain this trace” / executive summary on Overview.

## Success checks

- No blank modules  
- No vendor product names  
- Twin links resolve  
- AI panels return grounded OpsEdge-style guidance
