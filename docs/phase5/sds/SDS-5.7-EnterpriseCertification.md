# SDS-5.7 — Enterprise Certification & Production Validation

**Wave:** Phase 5 / Wave 7  
**Release track:** `v1.0.0-wave7`  
**Branch:** `feature/wave7-enterprise-certification`  
**Baseline:** `v1.0.0-wave6` / SHA `26e93b973f39e2cd8452e9ed15775bcf27b12d2f`

## Intent

Wave 7 does **not** add product features. It certifies Waves 1–6 under production architecture via measurable runs, drills, and reports.

## Surfaces

| Surface | Purpose |
|---------|---------|
| Migration `039_wave7_certification.sql` | Runs, reports, benchmarks, load, chaos, soak |
| `/admin/system/certification/*` | Control plane for suites, runs, reports |
| Host scripts | Real benchmarks/load/HA/chaos/security/soak against live stack |
| `/admin/system/certification` UI | Certification Center |
| `P5_WAVE7_VALIDATION_OK` | Production gate |

## Constraints

- Additive only; no Wave 1–6 API/UI/schema breaks
- No fake metrics — numbers come from executed probes
- Chaos/HA drills are controlled and reversible
- Full-scale load (1k users / 10k requests) supported via env; validation runs production-safe profiles that still exercise the same engines
- 24h soak supported via `CERT_SOAK_SECONDS`; validation runs a sustained soak window then attests

## Exit

`P5_WAVE7_VALIDATION_OK` + tag `v1.0.0-wave7`. No Wave 8 / GA claim.
