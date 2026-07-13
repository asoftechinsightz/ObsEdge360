# OpsEdge360 Enterprise Design System (EIG)

**Codename:** Enterprise Intelligence Glass (EIG)  
**Wave:** 2.5 — Enterprise UX Validation  
**Status:** Canonical reference for Executive Dashboard and Tier-A restyle

## Documents

| Document | Purpose |
|----------|---------|
| [TOKENS.md](./TOKENS.md) | CSS variables, spacing, motion, status colors |
| [COMPONENT_CATALOGUE.md](./COMPONENT_CATALOGUE.md) | Every reusable component — props, states, a11y |
| [WIDGET_CONTRACTS.md](./WIDGET_CONTRACTS.md) | Backend widget → frontend renderer mapping |
| [STATES.md](./STATES.md) | Loading, empty, error, cached, permission |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | Keyboard, ARIA, contrast, responsive |
| [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md) | Dashboard load, bundle, telemetry |
| [DEMO_DATA_REVIEW.md](./DEMO_DATA_REVIEW.md) | Illustrative demo estate quality |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Legacy widgets, cleanup recommendations |
| [ENTERPRISE_UX_REVIEW.md](./ENTERPRISE_UX_REVIEW.md) | **Master review + readiness score** |
| [RECOMMENDATIONS_BEFORE_WAVE_3.md](./RECOMMENDATIONS_BEFORE_WAVE_3.md) | Gate criteria for platform config |
| [screenshots/](./screenshots/) | Visual benchmark captures |

## Principles

1. **One design language** — EIG tokens + `eig/primitives` + widget contracts  
2. **Backend owns rules** — frontend displays widget contracts only  
3. **Executive storytelling** — health → status → risks → actions  
4. **Enterprise density** — tight spacing, no oversized cards  
5. **Subtle motion** — 120–200ms; respects `prefers-reduced-motion`

## Source of truth

- Tokens: `apps/web/src/app/globals.css`
- Primitives: `apps/web/src/components/eig/primitives.tsx`
- Widget views: `apps/web/src/components/dashboard/widgets/`
- Layout metadata: `apps/web/src/lib/dashboard-layout.ts`
- Shared contracts: `packages/shared-types/src/widgets.ts`

## Related

- [16_EIG_DESIGN_PRINCIPLES.md](../ux-audit/16_EIG_DESIGN_PRINCIPLES.md)
- [WAVE_2_IMPLEMENTATION.md](../backend-alignment/WAVE_2_IMPLEMENTATION.md)
