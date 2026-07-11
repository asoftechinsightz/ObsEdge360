# Discovery Engine Architecture

```text
Connectors (ssh/winrm/k8s/cloud/snmp/docker/database/middleware/…)
        │
        ▼
 Discovery Job Engine (parallel, rate-limit, retry)
        │  persists discovery_runs + discovery_results
        ▼
 publishAsset → CMDB ingest / Kafka
        │
        ▼
 Relationship inference + drift/history
```

Credentials: optional `secret_ref` on connectors resolved via Secrets provider at scan time.
