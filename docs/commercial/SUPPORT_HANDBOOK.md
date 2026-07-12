# Support Handbook (Commercial)

## Mission

Enable enterprise customers to operate OpsEdge360 with **minimal** AsoftechInsightz assistance, while providing a clear escalation path.

## Channels

| Channel | Use |
|---------|-----|
| Email | support@asoftechinsightz.com |
| Diagnostics | Customer runs `scripts/diagnostics-bundle.sh` and attaches archive |
| Pilot CS | Named owner per EPP engagement |

## Severity

| Sev | Definition | First response (commercial hours default) |
|-----|------------|-------------------------------------------|
| S1 | Outage / security incident | 1 hour |
| S2 | Major feature unusable (auth, core dashboards) | 4 hours |
| S3 | Degraded with workaround | 1 business day |
| S4 | Question / enhancement | Backlog |

## Intake checklist

- Product version / Git SHA / channel  
- Tenant / org slug  
- UTC timestamp  
- Impact (# users)  
- Diagnostics bundle attached  
- Already tried (restart, revoke sessions, restore from backup?)  

## Playbooks

| Symptom | First actions |
|---------|---------------|
| Cannot login | Lockouts table; MFA time sync; backup codes; `/security` |
| 401 after revoke | Expected for revoked `jti`; re-login |
| Health red | Gateway logs; postgres/redis; `diagnostics-bundle.sh` |
| Demo stale | `/demo` reset |
| Slow UI | Check Wave7 guidance; DB pool; HPA for large |

## Related

- [docs/pilot/SUPPORT_ESCALATION_GUIDE.md](../pilot/SUPPORT_ESCALATION_GUIDE.md)  
- [docs/rc2/SUPPORT_HANDBOOK.md](../rc2/SUPPORT_HANDBOOK.md)  
- [DIAGNOSTICS_BUNDLE.md](./DIAGNOSTICS_BUNDLE.md)
