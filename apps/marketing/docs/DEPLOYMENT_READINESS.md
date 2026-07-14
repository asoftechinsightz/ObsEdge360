# Enterprise Marketing — Deployment Readiness

**App:** `apps/marketing` · **Target:** `https://www.asoftechinsightz.com`  
**Status:** Pre-deploy — do not promote until checklist is complete.

## Brand gates

- [x] Zero **Trinetra360** references in `apps/marketing`
- [x] Products named **OpsEdge360**, **LeadEdge360**, **RetailEdge360** only
- [x] Company brand **AsoftechInsightz** / **Asoftech Business Suite** consistent in nav, hero, footer, metadata, JSON-LD, sitemap
- [x] Open Graph / Twitter titles align with enterprise AI positioning

## Experience gates

- [x] Hero communicates “We build enterprise AI platforms” in first viewport
- [x] Sticky header adapts over dark hero (no light header over dark orphan band)
- [x] Hero fades into paper sections (no dark scrolling strip)
- [x] Orphaned “Hover nodes” helper copy removed
- [x] Teal + Ink + Paper palette; reduced glow / electric blue
- [x] SVG / Canvas motion only (no Three.js / R3F install dependency)
- [x] Trust, services, architecture, deployment credibility strengthened

## Technical gates (run before deploy)

```bash
cd apps/marketing
npm run lint      # tsc --noEmit
npm run build
npm start         # smoke GET /
```

- [ ] Typecheck clean
- [ ] Production build succeeds
- [ ] No console errors on home + key routes (`/platform`, `/products`, `/trust`, `/pricing`, `/demo`)
- [ ] Responsive check: 375 / 768 / 1280 widths
- [ ] Lighthouse (local or staging): Performance / Accessibility / Best Practices / SEO reviewed
- [ ] `robots.ts` + `sitemap.ts` resolve under production origin
- [ ] Analytics env (`NEXT_PUBLIC_GTM_ID`) only if intended

## TLS / local tooling note

npm TLS leaf-signature failures are an **environment** issue (AVG HTTPS inspection / local trust).  
Do **not** set `strict-ssl=false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`.  
Do **not** block release on Three.js installs — SVG/Canvas is the supported path until the machine CA is fixed.

## Future (post-TLS fix)

Optional enhancement only: install `@react-three/fiber`, `three`, `@react-three/drei`, `framer-motion` via `npm run install:3d` and wire `viz/r3f` behind `VisualGate` — **evolve** existing scenes, do not redesign.

## Deploy

Do **not** deploy until every technical gate above is checked. Deployment steps remain in `DEPLOYMENT.md`.
