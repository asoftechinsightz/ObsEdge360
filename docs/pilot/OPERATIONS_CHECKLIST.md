# Operations Checklist

## Daily

- [ ] `/health` green  
- [ ] Compose/K8s pods healthy  
- [ ] Review open security alerts  
- [ ] Skim login failures in Security Center  

## Weekly

- [ ] Postgres backup + certify  
- [ ] Disk / memory / CPU review  
- [ ] Complete [WEEKLY_HEALTH_REVIEW_TEMPLATE.md](./WEEKLY_HEALTH_REVIEW_TEMPLATE.md)  
- [ ] Confirm MFA policy still `required`  
- [ ] Confirm no lab MFA flag  

## On incident

- [ ] Revoke sessions for affected users  
- [ ] Force password rotation if needed  
- [ ] Escalate per [SUPPORT_ESCALATION_GUIDE.md](./SUPPORT_ESCALATION_GUIDE.md)  

Commands: see `docs/rc2/OPERATIONS_RUNBOOK.md`.
