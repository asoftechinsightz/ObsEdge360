# Performance Report — Marketing v2.1

**Date:** 2026-07-13  
**Stack:** Next.js 14 App Router · Tailwind · no mandatory Three.js

## Strategy

| Technique | Implementation |
|-----------|----------------|
| Code splitting | Route-level pages; client islands only where interactive |
| Lazy / light interaction | SVG architecture; CSS/IntersectionObserver reveals |
| Fonts | `next/font` (Sora, Source Sans 3) with `display: swap` |
| Images | No heavy hero bitmaps; CSS mesh + SVG |
| Analytics | Optional GTM via `NEXT_PUBLIC_GTM_ID` |
| Optional heavy deps | R3F/GSAP/framer listed optional — not required for v2.1 |

## Build (local)

```bash
cd apps/marketing
node ../../node_modules/next/dist/bin/next build
```

**Result (2026-07-13):** PASS — 30 routes generated; home first load ~100 kB.

## Lighthouse targets

| Category | Target |
|----------|--------|
| Performance | ≥ 90 (stretch 95) |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 (stretch 100) |
| SEO | ≥ 95 |

Re-measure on production `www` after deploy (throttled mobile).

## Risks

- Client components on product pages add JS; keep panels lightweight.
- Avoid adding unoptimized screenshots; prefer interactive previews.
