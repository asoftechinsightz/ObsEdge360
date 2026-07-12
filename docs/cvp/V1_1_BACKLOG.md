# Version 1.1 Prioritized Backlog

**Rule:** Do **not** implement from this list until validated through pilots.  
**Empty by design** until customer evidence exists.

## Classification

| Class | Meaning |
|-------|---------|
| Customer Critical | Blocks pilot success / production trust |
| High Value | Clear ROI from named customer |
| Nice to Have | Useful but not evidence-gated yet |
| Future Vision | Explicitly deferred |

## Seed placeholders (awaiting evidence)

| ID | Item | Class | Customer evidence | Status |
|----|------|-------|-------------------|--------|
| — | _(none)_ | — | No pilot feedback imported yet | Open Feature Board |

## Intake path

1. Capture in `/admin/cvp/feedback`  
2. Promote via `/admin/cvp/feature-board` (requires customer)  
3. Apply **TITAN dual-customer rule** (`docs/titan/09_ROADMAP_DISCIPLINE.md`)  
4. Schedule in `/admin/cvp/releases` with evidence notes  
5. Only then consider Engineering Freeze allow-list work for v1.1  

Without a named customer → **Future Consideration**.  
Without a second independent request (unless critical ops/security/compliance) → **not major roadmap**.
