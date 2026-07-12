# Issue Escalation Guide — RC2 Pilot

## Severity matrix

| Severity | Definition | Customer update | Internal escalate |
|----------|------------|-----------------|-------------------|
| S1 | Production/pilot unavailable or security breach | 30–60 min | Eng lead + CS immediately |
| S2 | Major feature unusable (auth, MFA, core dashboards) | 4 hours | Eng on-call |
| S3 | Partial degradation / workaround exists | Daily | Backlog owner |
| S4 | Cosmetic / docs | Weekly digest | Product |

## Contacts (fill per engagement)

| Role | Name | Contact |
|------|------|---------|
| Customer pilot lead | _TBD_ | _TBD_ |
| AsoftechInsightz CS | _TBD_ | support@asoftechinsightz.com |
| Engineering owner | _TBD_ | _TBD_ |
| Security contact | _TBD_ | _TBD_ |

## Escalation path

1. Customer → CS via email/ticket.  
2. CS reproduces with SHA + validate script snippet.  
3. CS → Engineering if S1/S2 or > SLA.  
4. Security findings → Security contact + Eng simultaneously.

## Required ticket fields

- Git SHA  
- Tenant / org slug  
- UTC timestamp  
- Steps to reproduce  
- Impacted users count  
- Already tried (reset MFA, revoke sessions, etc.)
