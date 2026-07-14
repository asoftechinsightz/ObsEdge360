# Marketing Website — Component Documentation

## Layout shell

| Component | Role |
|-----------|------|
| `SiteHeader` | Sticky nav, theme toggle, Login, Request Demo |
| `SiteFooter` | Corporate / product / engage links |
| `ThemeProvider` | Light/dark via `class` on `<html>` + localStorage |
| `Analytics` | Optional GTM loader |

## Home

| Component | Section |
|-----------|---------|
| `HeroSection` | Full-viewport hero + lazy R3F (desktop) / CSS fallback |
| `HomePage` | Challenges → Suite → Products → Solutions → Why → Journey → Ecosystem → Deploy → Resources → CTA |
| `ArchitectureSection` | Interactive 3D + layer list |
| `StatsSection` | Animated enterprise posture strip |
| `Reveal` | Framer Motion scroll reveal |

## 3D / interactive architecture

| Component | Notes |
|-----------|-------|
| `PlatformVisual` | Interactive SVG suite graph (hover/focus); mobile-safe; no gaming effects |
| Optional R3F | Listed under `optionalDependencies` — enable when registry TLS allows installing `three` / `@react-three/fiber` |

## Forms

| Component | Notes |
|-----------|-------|
| `LeadForm` | Demo / contact; mailto handoff + dataLayer |

## Content pages

`/platform` `/products` `/solutions` `/services` `/resources` `/company` `/partners` `/contact` `/demo`

Shared `PageHero` for interior pages.

## Design tokens

Tailwind: `ink`, `paper`, `accent` (teal), `cobalt`, fonts `Sora` + `Source Sans 3`. Avoids purple-gradient / cream-terracotta AI defaults.
