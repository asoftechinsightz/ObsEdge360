# AsoftechInsightz Marketing Website v2.3

Corporate marketing site for **AsoftechInsightz** — enterprise AI platforms and the **Asoftech Business Suite** (OpsEdge360 · LeadEdge360 · RetailEdge360).

```bash
cd apps/marketing
npm run dev   # http://localhost:3010
npm run lint
npm run build
```

Docs: [docs/marketing/](../../docs/marketing/) · Readiness: [docs/DEPLOYMENT_READINESS.md](./docs/DEPLOYMENT_READINESS.md)

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GTM_ID` | Optional Google Tag Manager container ID |

## Visual stack

Production uses **SVG + Canvas2D** (`VisualGate` → `Immersive2D`) for the command center, architecture flow, and network backdrop. Motion stays subtle and respects `prefers-reduced-motion`.

React Three Fiber / Three.js / Framer Motion remain optional future enhancements only after the local TLS environment is fixed. Do not disable npm SSL to install them.

## Deploy (www.asoftechinsightz.com)

Do **not** deploy until [DEPLOYMENT_READINESS.md](./docs/DEPLOYMENT_READINESS.md) technical gates pass.

1. Build via `Dockerfile` in this folder.
2. Reverse-proxy `www.asoftechinsightz.com` → container port `3010`.
3. TLS via existing suite cert covering `www` / apex.
4. Keep product portals on their own hosts (`opsedge360…`, `leadedge360…`, `app…`).

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md).
