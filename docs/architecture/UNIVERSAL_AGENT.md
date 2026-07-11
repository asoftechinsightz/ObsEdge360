# Universal Agent Architecture

```text
┌─────────────────────────────────────────────┐
│ Universal Agent Runtime                     │
│  Identity (bootstrap / key / optional mTLS) │
│  Scheduler (HB, inventory, config, collect) │
│  PluginHost (host.metrics, host.logs, …)    │
│  DurableSqliteQueue (AES-GCM encrypted)     │
│  UpdateManager (check/verify interfaces)    │
│  Local health HTTP (optional)               │
└──────────────────┬──────────────────────────┘
                   │ HTTPS + X-Agent-Key
                   ▼
┌─────────────────────────────────────────────┐
│ API Gateway /api/v1/ua                      │
│  Tenant AuthZ for console                   │
│  Agent key auth for runtime                 │
└──────────────────┬──────────────────────────┘
                   ▼
         Postgres 023 + OTLP observability
```

Platform extensions (Docker/K8s/cloud/OT) register via `platformExtensionRegistry` without core changes.
