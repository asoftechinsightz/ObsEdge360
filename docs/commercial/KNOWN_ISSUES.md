# Known Issues — Commercial

| ID | Issue | Guidance |
|----|-------|----------|
| C-01 | Helm chart is gateway/web-centric | Use Compose for full mesh; disclose in SOW |
| C-02 | Large-scale soak is Wave7-gated | Do not claim 10k CERT without staging CERT_FULL_SCALE |
| C-03 | Browser synthetics simulated | Disclose vs Chromium worker |
| C-04 | RBA step-up framework-only | Scores recorded; no auto step-up |
| C-05 | Grafana board pack not complete | Use health/metrics + customer Grafana |
| C-06 | Historical DB name `trinetra360` | Alias only; brand is OpsEdge360 |
| C-07 | MFA secret re-key | Rotating `SECRETS_MASTER_KEY` needs planned re-enroll |

Closed for commercial pilots (RC3): plaintext TOTP; revoke-without-JWT-invalidation.

Full lists: `docs/rc3/KNOWN_ISSUES.md`, `docs/rc2/KNOWN_LIMITATIONS.md`.
