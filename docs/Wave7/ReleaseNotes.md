# Release Notes — v1.0.0-wave7

**Product:** OpsEdge360 · AsoftechInsightz  
**Tag:** `v1.0.0-wave7`  
**Focus:** Enterprise Certification & Production Validation

## Highlights

- Certification Center UI and APIs
- Migration `039_wave7_certification.sql`
- Real benchmark/load/soak runners
- Controlled HA/chaos drills
- Enterprise report pack (performance, load, HA, chaos, security, scalability, reliability, operational readiness, certification)

## Known limitations

- Full-scale 1k/10k load requires `CERT_FULL_SCALE=true` (validation uses production-safe concurrency on shared VPS)
- 24h soak requires `CERT_SOAK_SECONDS=86400` (validation runs a sustained soak window with the same engine)
- Disk-full / packet-loss injections are attested via controlled recreate drills; destructive host fills are operator-gated
- No GA claim (`gaClaim: false`)
