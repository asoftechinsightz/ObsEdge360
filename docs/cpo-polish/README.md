# CPO Polish — Screenshot Gate

Production tip: `e87b6c5`  
Captured against https://observability360.asoftechinsightz.com after demo enter.

## Evidence

| Artifact | Purpose |
|----------|---------|
| `01-login.png` | Demo entry CTA |
| `02-executive-home.png` | KPI + narrative + AI recommendations |
| `03-guided.png` | Guided evaluation |
| `04-drift.png` | Drift timeline / empty→loaded |
| `05-twin.png` | Digital Twin |
| `06-topology.png` | Topology |
| `07-banking360.png` | Banking360 narrative |
| `08-security.png` | Security Center |
| `09-reports.png` | Executive reports |
| `10-cmdb.png` | CMDB inventory |
| `11-discovery.png` | Discovery coverage |
| `12-itsm.png` | ITSM storytelling |
| `kpis.json` / `narrative.json` / `recommendations.json` | API truth for Executive Home |

## Verified API (demo tenant)

- Availability **99.90%**, revenue at risk **₹120K/hr**, compliance **90**, incidents **8**
- Narrative answers what / why / impact / owner / next
- Proactive recommendations for Banking360, Drift, Twin, Reports

## Known infra note

CMDB mesh mTLS certs were expired on the VPS; gateway now falls back to Postgres for CI/drift/stats/topology reads so the CIO spine stays populated.
