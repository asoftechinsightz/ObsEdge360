# Production Readiness Checklist — Commercial

Use before first paying / production-like customer go-live.

## Package

- [ ] `bash scripts/generate-sbom.sh docs/commercial/sbom.json` succeeds  
- [ ] `bash scripts/package-commercial.sh` produces tarball + sha256  
- [ ] `bash scripts/commercial-validate.sh` green  
- [ ] OpenAPI present in package  
- [ ] `docs/commercial`, `docs/pilot`, `docs/rc3` included  

## Security

- [ ] Strong `JWT_SECRET` / `SECRETS_MASTER_KEY`  
- [ ] MFA required + TOTP enrolled for admins  
- [ ] Lab MFA codes disabled  
- [ ] Session revoke verified (401)  
- [ ] Known issues disclosed to customer  

## Operations

- [ ] Backup script run; dump stored off-box  
- [ ] `dr-validate.sh` pass  
- [ ] Restore drill on **non-prod** clone (quarterly)  
- [ ] Diagnostics bundle generated once as dry-run  
- [ ] Health / ready / metrics scraped or monitored  

## Customer enablement

- [ ] Evaluation package walkthrough completed  
- [ ] Admin + operator guides handed off  
- [ ] Support contacts filled  
- [ ] Exit / success criteria agreed (if pilot)  

## Gate

☐ Ready for commercial pilot / production SOW  
☐ Not ready — blockers: _____________

**SHA:** _____________ **Date:** _____________ **Owner:** _____________
