# Support Handbook — OpsEdge360 RC2 Pilot

## Channels

| Channel | Use |
|---------|-----|
| Email | `support@asoftechinsightz.com` |
| In-product | Help links from `/branding` → support mailto |
| Pilot CS owner | Named in customer kickoff (fill per engagement) |
| Engineering on-call | Internal only — via escalation guide |

## Severity routing

| Sev | Example | Target first response |
|-----|---------|------------------------|
| S1 | Full outage, auth down | 1 hour (pilot business hours unless 24×7 contracted) |
| S2 | MFA broken for all users, data incorrect | 4 hours |
| S3 | Single-user issue, UI defect | 1 business day |
| S4 | Enhancement / question | Backlog |

## Common playbooks

1. **Cannot login after MFA required** — Confirm authenticator time sync; try backup code; re-enroll via admin.  
2. **Demo looks stale** — `/demo` → Confirm reset.  
3. **API 401 storm** — JWT secret rotated without restart? Redeploy with consistent secret.  
4. **Validation script fail** — Capture `scripts/vps-rc2-validate.sh` output; attach Git SHA.

## Knowledge base pointers

- Install: [PILOT_INSTALLATION_GUIDE.md](./PILOT_INSTALLATION_GUIDE.md)  
- Limits: [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)  
- Escalate: [ISSUE_ESCALATION_GUIDE.md](./ISSUE_ESCALATION_GUIDE.md)
