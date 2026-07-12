# ROI Calculator (Worksheet)

Use with customer inputs. Replace assumptions with their numbers.

## Inputs

| Input | Customer value | Default assumption |
|-------|----------------|--------------------|
| Sev-1 incidents / year | | 12 |
| Avg hours per Sev-1 (war room) | | 20 |
| Fully loaded cost / hour | | $100 |
| Monitoring tools consolidated | | 2 |
| Annual tool spend avoided | | $80,000 |
| Audit prep hours saved / year | | 200 |
| OpsEdge360 Year-1 cost (quote) | | _quote_ |

## Calculations

```
Incident cost saved = Sev-1s × hours × rate × improvement%
  (improvement% default 25% with unified RCA + ITSM visibility)

Tool consolidation saved = annual avoided spend × probability (default 50% Year-1)

Audit hours saved = hours × rate

Year-1 benefit = incident + tools + audit
ROI = (Year-1 benefit − Year-1 cost) / Year-1 cost
Payback months = Year-1 cost / (Year-1 benefit / 12)
```

## Output blurb (template)

“Based on your inputs, OpsEdge360 models ~**X** Year-1 benefit and ~**Y**-month payback, driven primarily by faster incident explanation and tool consolidation—not vanity dashboards.”

Store completed worksheets in the opportunity folder (not in git).
