# Administrator Guide (Commercial)

Canonical deep guides remain in Wave9 / RC packs. This is the **customer-facing admin index**.

## Day-1 admin tasks

1. Deploy from [PRODUCTION_RELEASE_PACKAGE.md](./PRODUCTION_RELEASE_PACKAGE.md).  
2. Set secrets: `JWT_SECRET`, `SECRETS_MASTER_KEY`, DB passwords.  
3. Run migrations (through 047).  
4. Create admin → enroll TOTP at `/security` → store backup codes.  
5. Set MFA policy `required` for production-like tenants.  
6. Configure SSO (OIDC/SAML) if required.  
7. Confirm branding: `GET /api/v1/branding` → `OpsEdge360`.  

## Checklists

- [docs/pilot/ADMINISTRATOR_CHECKLIST.md](../pilot/ADMINISTRATOR_CHECKLIST.md)  
- [docs/rc3/SECURITY_ASSESSMENT.md](../rc3/SECURITY_ASSESSMENT.md)  

## Deeper references

| Topic | Doc |
|-------|-----|
| Installation | `docs/Wave9/InstallationGuide.md`, `docs/rc2/PILOT_INSTALLATION_GUIDE.md` |
| Admin depth | `docs/Wave9/AdministratorGuide.md` |
| Security policies | Wave6 admin + `/security` |
| Upgrade | [MAINTENANCE_UPGRADE_GUIDE.md](./MAINTENANCE_UPGRADE_GUIDE.md) |

## Do not

- Enable `OPS_MFA_LAB_CODES` on customer systems  
- Ship weak JWT secrets  
- Rename production DB alias `trinetra360` (documented historical alias only)
