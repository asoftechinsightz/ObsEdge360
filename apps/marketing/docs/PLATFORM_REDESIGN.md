# Platform Page Redesign — Pre-Approval

**Status:** Ready for executive visual review · **Do NOT deploy**  
**Preview:** http://localhost:3010/platform

## 5-second promise

| Question | Where answered |
|----------|----------------|
| What is AsoftechInsightz? | Hero — builds enterprise platforms / suite |
| What is the Business Suite? | Hero headline + suite ecosystem SVG |
| How products work together | Connected flow: Lead → Retail → Ops → Executive AI |
| Why not separate tools? | Challenge + unified platform + shared services |

## Before → After

| Before | After |
|--------|-------|
| Static PageHero + two consulting text blocks | Premium dark hero with interactive suite SVG |
| Architecture as stacked labels | Dedicated architecture section with animated flow |
| Isolated product framing | Vertical ecosystem flow with pulses |
| Bullet shared capabilities | Visual shared-services lattice (10 capabilities) |
| Mostly white page | Paper → teal → wash → glass → paper → teal → ink rhythm |
| Documentation feel | Executive visual storytelling |

## Sections

1. Hero (badge, CTAs, ecosystem visual)  
2. Business challenge  
3. Unified platform (+ ecosystem viz)  
4. How products connect  
5. Platform architecture  
6. Shared platform layer  
7. Business outcomes  
8. CTA  

## Validation

- [x] `tsc` + production build  
- [x] Desktop hero screenshot captured  
- [x] Mobile / responsive review in browser  
- [x] Lighthouse lab: Perf **76** · A11y **100** · BP **100** · SEO **100** · CLS **0**  
- [ ] Human executive approval  
- [ ] Deploy (blocked)  

Lighthouse file: `docs/lighthouse-platform.json`  
Canvas: `platform-redesign-gate.canvas.tsx`

## Visual stack

SVG + Canvas only · subtle data pulses · `prefers-reduced-motion` respected · no Three.js
