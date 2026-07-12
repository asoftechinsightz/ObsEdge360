# Customer Onboarding Guide

## Day 0 — Kickoff

1. Confirm pilot goals, success metrics, and exit criteria ([EXIT_CRITERIA.md](./EXIT_CRITERIA.md)).  
2. Name customer pilot lead, admin, and security contact.  
3. Agree topology: Compose single / HA / Helm.  
4. Schedule executive walkthrough (10–15 min via `/demo`).

## Day 1 — Install & secure

1. Deploy using [PILOT_DEPLOYMENT_PACKAGE.md](./PILOT_DEPLOYMENT_PACKAGE.md).  
2. Run migrations (045–047).  
3. Create admin → `/security` enroll TOTP → store backup codes.  
4. Set MFA policy `required`: `PUT /api/v1/security/mfa-policy`.  
5. Confirm logout/login requires MFA.  
6. Revoke a test session and confirm JWT is rejected (RC3 session binding).  
7. Complete [ADMINISTRATOR_CHECKLIST.md](./ADMINISTRATOR_CHECKLIST.md).

## Day 2–N — Operate

- Use [OPERATIONS_CHECKLIST.md](./OPERATIONS_CHECKLIST.md) and weekly health review.  
- Run Banking360 demo scenario for regulated audiences.  
- Capture feedback with [PILOT_FEEDBACK_FORM.md](./PILOT_FEEDBACK_FORM.md).

## Support

See [SUPPORT_ESCALATION_GUIDE.md](./SUPPORT_ESCALATION_GUIDE.md) and `docs/rc2/SUPPORT_HANDBOOK.md`.
