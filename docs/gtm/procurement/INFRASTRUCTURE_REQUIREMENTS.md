# Infrastructure Requirements

## Minimum (pilot)

| Resource | Guidance |
|----------|----------|
| OS | Ubuntu 22.04+ or equivalent |
| CPU | 4+ cores |
| RAM | 8 GB (16 GB recommended) |
| Disk | 100+ GB SSD |
| Network | HTTPS to users; restricted DB/redis ports |
| Software | Docker Engine + Compose v2 |

## Production-like

| Resource | Guidance |
|----------|----------|
| RAM | 16–32 GB+ |
| HA | Multi-node Compose HA or K8s with capacity planning |
| Backup target | Off-host object storage / NAS |
| IdP | OIDC/SAML endpoints reachable |
| TLS | Trusted certificates |

## Ports (typical)

Web 443/3000 · API 4000 (often proxied) · Postgres/Redis internal only.

See `docs/commercial/OPERATOR_GUIDE.md` and compose files for binds.
