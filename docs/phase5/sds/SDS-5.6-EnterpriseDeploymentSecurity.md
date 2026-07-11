# SDS-5.6 — Enterprise Deployment & Security Hardening

**Document ID:** OE360-SDS-5.6  
**Wave:** Phase 5 / Wave 6  
**Release track:** `v1.0.0-wave6`  
**Branch:** `feature/wave6-enterprise-deployment`  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Depends on:** Wave 5 closed (`v1.0.0-wave5` / `043ff9be`)

## Objectives

1. Migration **038** — additive metadata for air-gap packages, backup/restore certification, secret rotation jobs, enterprise certificates, deployment health.
2. Offline/air-gap packaging scripts + manifest verification (no internet required to install from package).
3. Production Helm values: HPA, PDB, probes, affinity, PVC, ConfigMap/Secret templates, web+gateway, rolling updates.
4. DR: backup schedules, checksum certification, restore attestation reports (host scripts + admin APIs).
5. Secret rotation productization (scheduler jobs, version history, expiry notifications via audit).
6. Password/session policy UI enhancement (existing Wave 3 enforcement — do not replace).
7. Certificates inventory (upload metadata, validate, expiry alerts) — additive to trust mesh.
8. Operational health + System Security admin pages.
9. Validation **`P5_WAVE6_VALIDATION_OK`**.

## Non-goals

- `P5_GA_VALIDATION_OK` / final `v1.0.0`
- Breaking Wave 1–5 APIs or renaming tables
- Destructive remote restore API (host-side restore remains)

## Acceptance

Production script prints `P5_WAVE6_VALIDATION_OK`.
