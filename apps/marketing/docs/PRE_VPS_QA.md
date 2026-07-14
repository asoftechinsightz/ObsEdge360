# Pre-VPS Quality Gate — Marketing Site

**Preview:** http://localhost:3010  
**Verdict:** Ready for **human visual sign-off**. **Do not deploy** until approved.  
**Canvas:** `marketing-qa-gate.canvas.tsx`

## Buyer test (10 seconds) — Pass

| Question | Hompage evidence |
|----------|------------------|
| What do they do? | “We build enterprise AI platforms.” |
| Why trust? | Trust Center CTA + nav + credibility section |
| Which products? | Available OpsEdge360 / LeadEdge360; RetailEdge360 in development |
| Demo? | Book Demo + Request Executive Demo |
| Differentiation? | One governed suite vs tool sprawl |

## Lighthouse (lab, local HTTP)

| Category | Score |
|----------|------:|
| Accessibility | **100** |
| SEO | **100** |
| Best Practices | **100** |
| Performance | **62** (CLS **0**, FCP ~1.9s, LCP ~3.2s) |

Performance target ≥90 is **not claimed** from this agent lab (AVG HTTPS inspection + continuous canvas). Re-run Lighthouse in a normal Chrome profile after visual approval.

## Production checklist

- [x] All primary routes 200  
- [x] robots + sitemap  
- [x] Favicon (`src/app/icon.svg`)  
- [x] Brand / metadata / JSON-LD  
- [x] A11y contrast + list structure  
- [x] No Trinetra360 in `apps/marketing`  
- [ ] Human hero / palette / spacing review  
- [ ] Clean-browser Lighthouse Perf ≥90 (optional gate)  
- [ ] Deploy approval  

## Next step

Review the local UI yourself. When satisfied, reply **Deploy to VPS**.
