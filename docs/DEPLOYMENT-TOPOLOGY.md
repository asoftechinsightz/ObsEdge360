# Deployment Topology — SaaS / Hybrid / On-Prem

OpsEdge360 supports three deployment models via **environment variables only** — no code forks.

## Modes

| Mode | `DEPLOYMENT_MODE` | Description |
|------|-------------------|-------------|
| **SaaS** | `saas` | Multi-tenant cloud. Shared control plane. Data residency per tenant region. |
| **Hybrid** | `hybrid` | Control plane in cloud; CMDB/telemetry data in customer VPC/region. |
| **On-Prem** | `onprem` | Single-tenant in customer data center. Minimal external dependencies. |

## Performance Profiles

| Profile | `PERFORMANCE_PROFILE` | DB pool | Cache TTL | Use case |
|---------|----------------------|---------|-----------|----------|
| Minimal | `local` | 8 | 30s | Small on-prem footprint |
| Standard | `standard` | 20 | 60s | Mid-size deployment |
| High | `high` | 50 | 120s | SaaS at scale |

## Configuration Matrix

| Setting | SaaS | Hybrid | On-Prem |
|---------|------|--------|---------|
| Multi-tenant | Yes | Yes | No |
| Kafka | Required | Required | Optional (HTTP fallback) |
| Redis | Recommended | Recommended | Optional (memory cache) |
| Data residency | Enforced | Enforced | Customer-controlled |
| Neo4j / OpenSearch | Managed cloud | Regional | Optional |

## Example `.env` Files

### SaaS (production)

```env
DEPLOYMENT_MODE=saas
PERFORMANCE_PROFILE=high
KAFKA_ENABLED=true
CACHE_BACKEND=redis
REDIS_URL=redis://redis-cluster:6379
CACHE_ENABLED=true
AUTH_REQUIRED=true
```

### Hybrid (regulated BFSI)

```env
DEPLOYMENT_MODE=hybrid
PERFORMANCE_PROFILE=standard
DATA_RESIDENCY_REGION=ap-south-1
KAFKA_ENABLED=true
REDIS_URL=redis://customer-vpc-redis:6379
```

### On-Prem (customer data center)

```env
DEPLOYMENT_MODE=onprem
PERFORMANCE_PROFILE=standard
KAFKA_ENABLED=true
CACHE_BACKEND=redis
AUTH_REQUIRED=true
```

## Performance at Scale

Built-in optimizations (minimal ops overhead):

1. **Response cache** — Gateway caches hot read paths (executive KPIs) via Redis or in-memory LRU
2. **Connection pooling** — Per-service Postgres pools sized by `PERFORMANCE_PROFILE`
3. **Event bus fallback** — HTTP when Kafka unavailable (on-prem lite)
4. **Docker profiles** — `core` (postgres, redis, kafka) or `full` (all infra)
5. **Horizontal scale** — Helm chart supports replica counts + HPA (see `infra/helm/`)

## Kubernetes / Helm

```yaml
# infra/helm/trinetra360/values.yaml
global:
  deploymentMode: saas   # saas | hybrid | onprem
  performanceProfile: high
```

Scale gateway and stateless services independently:

```yaml
apiGateway:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilization: 70
```

## Sustainance Principle

- **One codebase** for all topologies
- **Env-driven** behavior — no separate SaaS/on-prem branches
- **Progressive complexity** — start with `onprem` + `standard`, scale to `saas` + `high` as load grows
