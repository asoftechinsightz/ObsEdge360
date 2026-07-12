# Health Score Framework

Score **0–100**. Review weekly in CS.

| Dimension | Weight | Green signals | Red signals |
|-----------|--------|---------------|-------------|
| Reliability | 25 | Health uptime, few Sev-1s | Repeated outages |
| Adoption | 25 | Weekly active users/modules | Only admin logs in |
| Security posture | 20 | MFA on, no lab flags | Weak secrets / open alerts |
| Engagement | 15 | Sponsor attends cadence | Ghosting / no champion |
| Value realized | 15 | Documented outcome | No success story emerging |

## Bands

| Score | Status | Action |
|-------|--------|--------|
| 80–100 | Green | Expand / reference ask |
| 60–79 | Yellow | Adoption plan + exec sync |
| <60 | Red | Executive escalation this week |

## Data sources

- Product: login_history, module usage (as available), health  
- Human: QBR notes, ticket volume, sentiment  

Store scores in CS CRM — not required in git.
