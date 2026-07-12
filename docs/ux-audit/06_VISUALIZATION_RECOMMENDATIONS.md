# 06 — Visualization Recommendations

**Libraries today:** `recharts`, `cytoscape`, `lucide-react`  
**Rule:** Prefer business visualizations; raw JSON only in Developer/API Explorer or Debug Mode.

---

## Replace these patterns

| Current | Replace with |
|---------|----------------|
| Full-page `JSON.stringify` | KPI cards + description lists + tables |
| Truncated JSON widget blobs | Typed widget components |
| Mock SLA line without badge | Live series **or** labeled “Illustrative sample” |
| Unlabeled Cytoscape blobs | Graph + legend + selected-node inspector |
| Token / SHA strings | Status badge (“Pilot validation: Passed”) without token text |
| Prometheus config JSON | Form fields + “Advanced (Debug)” |

---

## Recommended viz by domain

| Domain | Primary viz | Secondary |
|--------|-------------|-----------|
| Executive Home | KPI cards, service health table, risk list, SLA timeseries | Sparkline per service |
| Incidents / Ops Intel | Severity timeline, queue table, blast-radius graph | Owner swimlane |
| Twin / Topology / Service map | Dependency graph (Cytoscape) | Side inspector, filters |
| Synthetics | Journey step waterfall, uptime heatmap | Error budget burn |
| CMDB / Drift | CI table, relationship graph, drift risk matrix | Diff timeline |
| Transactions | Journey Sankey / step funnel | Latency timeseries |
| Compliance | Control posture score, gap matrix | Framework coverage bars |
| Sustainability | KPI + trend | Intensity heatmap |
| Capacity / Storage | Utilization gauges + forecast | Trend |
| Backup / HA | RPO/RTO cards + event timeline | Replication lag chart |
| Security | Session table, alert feed, MFA coverage donut | Geo/login anomaly (if data) |
| Reports | Report gallery cards + rendered preview | Scheduled list |
| Marketplace | Pack/catalog cards | Entitlement table |

---

## Chart standards

1. Always show **units**, **time range**, **last updated**.  
2. Empty chart → EmptyState with “Run synthetic” / “Connect data” CTA—not blank axes.  
3. Error → ErrorState + Retry—not empty plot.  
4. Color: semantic status (healthy/warn/critical) consistent with design tokens.  
5. Export CSV/PNG where tables/charts already have data (presentation layer).  
6. Accessibility: text alternative summary under chart; do not rely on color alone.

---

## Developer data path

```
Standard UI → business components
     └─ “View technical details” (role/flag gated)
            └─ Debug Mode / API Explorer → JSON, IDs, tokens, SHA
```

Do not invent new backend capabilities—map existing API fields into components.
