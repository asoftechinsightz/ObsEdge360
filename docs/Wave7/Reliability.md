# Wave 7 — Reliability

Soak sessions (`soak_sessions`) record planned/actual duration, checkpoints, and leak signals (heap/RSS deltas). Validation runs a sustained soak via `CERT_SOAK_SECONDS` (use `86400` for 24h). Schedulers and long-running workflow attestation use the same certification run pipeline.
