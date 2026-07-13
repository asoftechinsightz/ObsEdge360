# Sprint 2 — Release Notes

## Summary

Delivers the **OpsEdge360 Unified Observability Experience**: applications, infrastructure, Kubernetes, containers, databases, logs, metrics, traces, and topology — all inside OpsEdge chrome with Digital Twin and AI hooks.

## Customer-facing

- New Observability hub with module sub-navigation  
- Domain inventories with health, impact, and Twin deep links  
- Enterprise log explorer, metrics categories, trace waterfall, interactive topology  
- Inline AI investigation on every observe screen  
- Demo telemetry packs for Banking360, Retail360, Cloud Native, Kubernetes, Hybrid Infrastructure  

## Platform

- `ObserveAdapter` SPI with native OTel adapter + engine slot (fixtures until connector configured)  
- Gateway façade: `/api/v1/observe/*`  
- EDE enter/load/reset seeds observability telemetry  
- RBAC: `/observe` aliases to `observability:*`  
- Search workspaces updated for Logs / Traces / Observability  

## Non-goals (intentional)

- No customer-facing SkyWalking / Grafana UI  
- Full live SkyWalking GraphQL client deferred until connector credentials are provisioned (SPI ready)  
- Formal WCAG AA certification remains Sprint 10 / v1.1 residual
