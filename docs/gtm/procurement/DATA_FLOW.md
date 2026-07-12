# Data Flow Diagrams

## Primary interactive flow

```mermaid
sequenceDiagram
  participant U as User
  participant W as Web
  participant G as API_Gateway
  participant S as Services
  participant D as Postgres
  U->>W: HTTPS
  W->>G: API_Bearer_JWT
  G->>G: AuthZ_Session_jti
  G->>S: Internal_calls
  S->>D: SQL
  S-->>G: JSON
  G-->>W: JSON
```

## Telemetry / ops flow (conceptual)

```mermaid
flowchart TB
  Agents[Agents_Synthetics] --> G[API_Gateway]
  G --> Obs[Observability_Service]
  Obs --> PG[(Postgres)]
  G --> Metrics[Metrics_Scrape]
```

## Trust notes

- Secrets and passwords never logged in diagnostics bundles.  
- Demo environments may kill-switch outbound integrations.  
- Customer supplies IdP assertions over SSO flows.

Provide customer-specific IP/FQDN overlays during architecture review.
