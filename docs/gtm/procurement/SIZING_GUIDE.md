# Sizing Guide

| Segment | Concurrent users (guidance) | Topology |
|---------|-----------------------------|----------|
| Small | ≤100 | Compose single/HA |
| Medium | ≤1,000 | Compose HA + Redis + pooling |
| Large | 5k–10k | Kubernetes HPA + Wave7 CERT staging validation |

## Honesty rule

RC2/RC3 **modeled** profiles are guidance. Large-scale claims require Wave7 `CERT_FULL_SCALE` (or customer soak) evidence.

## Knobs

- `PERFORMANCE_PROFILE`  
- Gateway concurrency / DB pool settings (platform-config)  
- HPA values in Helm  

## Engagement tip

Size for the **pilot scope**, then reassess at 60 days with real telemetry—not slideware maxima.
