# Sprint 2 — UI Guide

## Navigation

**Observe → Observability** opens the Unified Observability hub.  
Module subnav (always OpsEdge chrome):

Overview · Applications · Infrastructure · Kubernetes · Containers · Databases · Logs · Metrics · Traces · Topology

Legacy **APM** is under Debug / command palette only.

## Screen behaviors

| Screen | Primary job | Twin | AI |
|--------|-------------|------|----|
| Overview | 30-second estate picture + domain cards | Via narrative next link | Executive summary assist |
| Applications | Inventory + health + impact | Impact link per row | Explain entity |
| Infrastructure | Servers / VMs / cloud | Impact link | Explain entity |
| Kubernetes | Clusters / namespaces / workloads | Impact link | Explain entity |
| Containers | Container health | Impact link | Explain entity |
| Databases | DB health / latency | Impact link | Explain entity |
| Logs | Search / filter / severity / service | Twin + Trace links | Summarize logs |
| Metrics | Infra / app / business categories | — | Explain trends |
| Traces | List + waterfall | Correlate logs | Explain trace |
| Topology | Interactive graph + health colors | Impact on selection | Impact analysis |

## Branding rules

- Product name / chrome: **OpsEdge360** only  
- Engine label in overview: **Unified Observability**  
- Never show SkyWalking, Grafana, Prometheus UI, or other vendor chrome  
- Empty / error / loading states use shared `UiStates`

## Responsive

Subnav wraps; entity tables scroll horizontally on narrow viewports; topology canvas is full-width on mobile with detail panel below.
