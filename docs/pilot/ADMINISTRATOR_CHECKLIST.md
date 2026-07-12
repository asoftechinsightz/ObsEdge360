# Administrator Checklist

**Template — complete during onboarding.**

## Identity & access

- [ ] Admin account created; password meets policy  
- [ ] TOTP enrolled and verified; backup codes stored offline  
- [ ] MFA policy set to `required` (production-like pilots)  
- [ ] `OPS_MFA_LAB_CODES` unset  
- [ ] SSO (OIDC/SAML) configured if in scope  
- [ ] Session revoke tested (token rejected after revoke)

## Platform

- [ ] `GET /health` and `GET /branding` OK (`product=OpsEdge360`)  
- [ ] Migrations through 047 applied (`rc3_readiness` exists)  
- [ ] `SECRETS_MASTER_KEY` set (MFA encryption)  
- [ ] Strong `JWT_SECRET`  
- [ ] Backup script dry-run completed  

## Demo / evaluation

- [ ] `/demo` reset + Banking tour walked once  
- [ ] Banking360 dashboard loads  
- [ ] Copilot / synthetics / ITSM reachable for talk-track  

**Admin:** _____________ **Date:** _____________
