# Wave 9 — Known Issues / Limitations

1. Full-scale load (1k concurrent / 10k requests) and 24h soak are available via env gates; default validation uses production-safe profiles.
2. Destructive disk-full / packet-loss chaos is operator-gated.
3. Customer Kubernetes installs require cluster-admin outside the Compose VPS path.
4. Auto secret rotation requires explicit `SECRETS_AUTO_ROTATE=true`.
