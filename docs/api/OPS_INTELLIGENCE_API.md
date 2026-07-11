# Ops Intelligence API (Wave 5)

Base: `/api/v1/ops-intelligence`

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/correlate` |
| GET | `/incidents` |
| GET | `/incidents/:id` |
| POST | `/rca` |
| GET | `/rca/:id` |
| POST | `/anomalies/scan` |
| GET | `/anomalies` |
| POST | `/forecasts/generate` |
| GET | `/forecasts` |
| POST | `/remediation/request` |
| GET | `/remediation/approvals` |
| POST | `/remediation/approvals/:id/execute` |
| GET | `/signals` |

Auth: JWT + tenant isolation. Remediation execute is **dry-run only** in Wave 5.
