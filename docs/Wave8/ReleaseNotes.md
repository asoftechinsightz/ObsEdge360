# Release Notes — v1.0.0-rc1

**Product:** OpsEdge360 · AsoftechInsightz  
**Channel:** Release Candidate  
**Baseline:** `v1.0.0-wave7`

## Highlights

- Documentation freeze under `docs/Wave8/`
- RC packaging (`scripts/package-rc.sh`) for Compose, Helm, air-gap helpers, OpenAPI
- Install/upgrade/rollback attestations
- Pilot checklists (deployment, acceptance, rollback, support, escalation)
- Reproducible demo seed (`scripts/demo-rc-seed.sh`)
- OpenAPI version `1.0.0-rc1` with JSON export endpoints
- Migration `040_wave8_release_candidate.sql` (additive)

## Known limitations

- Not General Availability — do not claim `P5_GA_VALIDATION_OK` or tag `v1.0.0`
- Full-scale load/soak remain env-gated (Wave 7)
- Destructive chaos fills remain operator-gated
- Fresh K8s install on customer clusters requires cluster-admin privileges outside this VPS compose path

## Compatibility

Fully backward compatible with Waves 1–7 APIs and schemas.
