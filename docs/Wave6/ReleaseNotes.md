# Release Notes — v1.0.0-wave6

**Product:** OpsEdge360  
**Company:** AsoftechInsightz  
**Tag:** `v1.0.0-wave6`  
**Wave:** Phase 5 Wave 6 — Enterprise Deployment & Security Hardening

## Highlights

- Air-gap package build/verify scripts and control-plane package registry
- Production Helm values (HPA, PDB, probes, PVC, ConfigMap/Secret, web+gateway)
- Backup & restore certification APIs (host-side restore preserved)
- Secret rotation jobs, scheduler notifications, gated auto-rotate
- Password & session policy administration under System Security
- Enterprise certificate inventory (upload / validate / rotate metadata)
- Operational Health and Deployment Center Admin UI
- Migration `038_wave6_enterprise_deployment.sql`

## Compatibility

- Backward compatible with Waves 1–5 APIs and tables
- No GA claim (`gaClaim: false`)

## Known limitations

- Live production remains Compose on VPS; Kubernetes is packaged/validated via Helm artifacts + profile API
- Auto secret rotation disabled unless `SECRETS_AUTO_ROTATE=true`
- PITR requires site WAL archiving beyond attestation APIs
- Air-gap full install needs local images present before packaging
