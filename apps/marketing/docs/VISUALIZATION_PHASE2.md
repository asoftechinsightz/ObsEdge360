# Marketing Visualization Phase 2 — Preview Report

**App version:** 2.2.0  
**Date:** 2026-07-14  
**Scope:** Immersive enterprise 3D / motion layer (desktop) with graceful mobile fallbacks

## Runtime architecture

| Layer | Status | Notes |
|-------|--------|-------|
| SVG/Canvas2D Command Center | **Active (default)** | Communicates platform nodes + data flow without WebGL |
| Glass product cards | **Active** | CSS 3D hover ≤ ~3–5° |
| Architecture stack animation | **Active** | Layered suite → customer systems |
| Network field backdrop | **Active** | Canvas2D node graph |
| Scroll storytelling | **Active** | IntersectionObserver reveals |
| R3F / Three.js scenes | Optional in `viz/r3f/` | Enable after `npm run install:3d` + wire VisualGate |

## Why default is not WebGL today

Monorepo `npm install` of `@react-three/fiber` hung in this environment. Next.js also fails the page bundle if R3F is statically imported without packages present. The immersive narrative is therefore delivered via high-quality 2D (enterprise-calm), with R3F sources ready for activation.

## Design guardrails applied

- Teal / cobalt / ink palette only — no neon rainbows  
- No spinning showpieces, no particle storms  
- `dpr` capped (1–1.5), transparent canvas, ACES tone mapping on hero  
- `prefers-reduced-motion` + `max-width: 1023px` force lightweight visuals  

## Local preview

```bash
cd apps/marketing
npm install --workspaces=false
# Optional full WebGL stack (desktop enhancement):
npm run install:3d
npm run dev   # http://localhost:3010
```

Without `install:3d`, the site uses the **premium SVG/Canvas2D Command Center** (same narrative, 60fps-friendly). R3F sources under `src/components/viz/r3f/` are ready; wire them into `VisualGate.tsx` after packages install successfully.
### Desktop checklist
- [ ] Hero 3D loads without console errors  
- [ ] Architecture stack animates data flow  
- [ ] Product cards tilt subtly on hover  
- [ ] Scroll sections fade/rise once  
- [ ] FPS feels smooth on a modern laptop (≥50 fps target)

### Mobile checklist (≤1023px)
- [ ] SVG fallback in hero (no WebGL)  
- [ ] Glass cards still readable  
- [ ] No janky scroll  

## Performance notes (expected)

| Metric | Target | Approach |
|--------|--------|----------|
| Hero WebGL | ≤1 canvas, ~7 nodes + links | Low poly icosahedrons |
| Architecture | Single canvas | Box layers + few pulse spheres |
| Network backdrop | Optional opacity ~0.55 | ≤26 nodes / 42 links |
| Bundle | Dynamic `ssr: false` imports | Three only on desktop |

Measure in Chrome Performance / fps meter before production deploy.

## Screenshots / evidence

Capture after `npm run dev`:
1. Desktop hero with Command Center  
2. Architecture section with flow animation  
3. Glass product cards hover  
4. Mobile width SVG fallback  

## Deploy gate

Do **not** deploy to www until:
1. Brand review items from Phase 1 (OpsEdge naming, hero/header clip) are accepted  
2. Desktop + mobile screenshots attached  
3. `npm run build` + `npm run lint` pass  
