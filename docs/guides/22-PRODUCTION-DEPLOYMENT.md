# OpsEdge360 — Production Deployment Guide

## Prerequisites

- Kubernetes 1.28+ cluster (3+ nodes, multi-AZ)
- Helm 3.14+
- Terraform 1.7+ (for cloud infra)
- Container registry access
- DNS and TLS certificates

## Deployment Steps

### 1. Infrastructure (Terraform)

```bash
cd infra/terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

Provisions: EKS/AKS/GKE cluster, RDS PostgreSQL, ElastiCache Redis, MSK Kafka.

### 2. Secrets

```bash
kubectl create namespace trinetra360
# Inject secrets via Vault or sealed-secrets
kubectl apply -f infra/k8s/secrets.yaml
```

### 3. Data Stores

Deploy managed PostgreSQL, Neo4j, OpenSearch per cloud provider or use Helm charts in `infra/helm/trinetra360/charts/data/`.

### 4. Platform Services

```bash
helm upgrade --install trinetra360 infra/helm/trinetra360 \
  -n trinetra360 \
  -f infra/helm/trinetra360/values-prod.yaml
```

### 5. Database Migration

```bash
kubectl exec -it deploy/api-gateway -n trinetra360 -- npm run db:migrate
```

### 6. Verification

- `curl https://api.trinetra360.example.com/health`
- Login to https://app.trinetra360.example.com
- Configure first discovery connector
- Verify CMDB populates within 15 minutes

## HA Configuration

- API Gateway: 3+ replicas, HPA min 3
- Kafka: 3 brokers, replication factor 3
- PostgreSQL: Multi-AZ RDS or Patroni cluster
- Neo4j: Causal cluster 3 core nodes

## DR Failover

See Operations Manual § Disaster Recovery.
