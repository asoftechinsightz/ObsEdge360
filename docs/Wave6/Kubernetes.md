# Wave 6 — Kubernetes

**Chart:** `infra/helm/opsedge360`  
**Version:** `1.0.0-wave6`  
**Production values:** `values-production.yaml`

## Features

| Feature | Template / values |
|---------|-------------------|
| Namespace | Install into `opsedge360` (operator-created) |
| HPA | `templates/hpa-gateway.yaml` |
| PDB | `templates/pdb-gateway.yaml` |
| Resource limits | `values-production.yaml` → deployments |
| Ingress | `templates/ingress.yaml` |
| PVC | `templates/pvc.yaml` |
| ConfigMap | `templates/configmap.yaml` |
| Secret | `templates/secret.yaml` (`createPlaceholder: false`) |
| Rolling updates | `maxUnavailable: 0`, `maxSurge: 1` |
| Liveness / readiness / startup | gateway + web deployments |
| Pod anti-affinity | preferred hostname spread |
| Local registry | `image.registry` prefix for air-gap |

## Install sketch

```bash
kubectl create namespace opsedge360
helm upgrade --install opsedge360 infra/helm/opsedge360 \
  -n opsedge360 \
  -f infra/helm/opsedge360/values-production.yaml \
  --set image.registry=registry.local/opsedge360 \
  --set ingress.host=observability360.example.com
```

## Notes

- Secrets must be supplied via sealed-secrets / external-secrets — chart does not ship credentials.
- Current live production remains Compose on the Asoftech VPS; Helm is the supported K8s production path for Wave 6.
