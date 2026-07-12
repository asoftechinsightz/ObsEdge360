# Operations Runbook — RC2 Pilot

## Daily
- Health `/api/v1/health`, ready, live
- Security Center open alerts
- Disk / backup job status

## Weekly
- Review login failures
- Rotate unused API tokens
- Demo reset before executive sessions

## Incidents
1. Confirm blast radius (tenant vs platform)
2. Revoke sessions if credential risk
3. Capture audit + login_history
4. Restore from last verified backup if data integrity impacted

## Deploy
Use bundle + `vps-deploy-latest.sh` with `DEPLOY_BRANCH=feature/rc2-pilot-production-readiness` (or release tag).
