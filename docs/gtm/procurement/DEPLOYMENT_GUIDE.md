# Deployment Guide (Procurement-facing)

## Paths

| Path | When |
|------|------|
| Docker Compose prod | Standard enterprise pilot / many productions |
| Compose HA overlay | Resilience requirements |
| Helm | K8s platform teams (gateway/web focus) |
| Air-gap | No outbound registry access |

## Steps (Compose summary)

1. Provision host per infrastructure requirements.  
2. Unpack commercial tarball / clone attested SHA.  
3. Configure `env.sample` → `.env` with strong secrets.  
4. `docker compose ... up` + migrate.  
5. Verify health/branding/MFA.  
6. Configure backups.  

## Evidence packs

- `docs/commercial/PRODUCTION_RELEASE_PACKAGE.md`  
- `docs/rc2/PILOT_INSTALLATION_GUIDE.md`  
- `docs/rc3/UPGRADE_GUIDE.md`  
- `scripts/package-commercial.sh` output  

## Customer responsibilities

OS hardening, TLS certificates, network ACLs, backup offsite storage, IdP configuration.
