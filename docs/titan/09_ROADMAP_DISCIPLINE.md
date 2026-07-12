# 09 — Roadmap Discipline Rule

## The rule

**No major feature enters the OpsEdge360 roadmap unless:**

1. **At least two pilot (or production) customers independently request it**, **or**  
2. It addresses a **critical operational, security, or compliance** requirement.

## Enforcement

| Gate | Mechanism |
|------|-----------|
| Intake | CVP Feedback requires customer + impact |
| Governance | Feature Board auto-classifies no-customer items as Future Consideration |
| Release planning | Requires customer evidence text |
| Engineering Freeze | Product Approval + allow-list |
| v1.1 backlog | `docs/cvp/V1_1_BACKLOG.md` stays empty without evidence |

## What counts as “independent”

- Separate organizations (not two users at one logo)  
- Documented in CVP with date, role, and business impact  
- Not prompted solely by internal wishlist  

## Exceptions

Critical CVE, data-loss bug, install blocker, or regulatory control gap — may proceed under Freeze allow-list with Product + Security sign-off **without** waiting for two customers.
