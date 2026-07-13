# Design Tokens

Source: `apps/web/src/app/globals.css`

## Brand

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--primary` / `--eig-accent` | `#0ea5e9` | same | CTAs, links, focus |
| `--eig-accent-soft` | `rgba(14,165,233,0.14)` | lighter | Active nav inset |

## Surfaces

| Token | Purpose |
|-------|---------|
| `--surface` | Page canvas |
| `--eig-glass-bg` | Cards, header |
| `--eig-glass-bg-strong` | Sidebar, panels |
| `--eig-header-bg` | Fixed header |

## Typography

| Element | Classes | Size |
|---------|---------|------|
| Page H1 | `text-xl sm:text-2xl font-semibold` | 20–24px |
| Section H2 | `text-base font-semibold` | 16px |
| Panel H3 | `text-sm font-semibold` | 14px |
| Eyebrow | `text-[11px] uppercase tracking-[0.14em]` | 11px |
| Body | `text-xs sm:text-sm text-slate-400` | 12–14px |
| Meta | `text-[11px] text-slate-500` | 11px |

## Spacing (8px scale)

| Token | Value |
|-------|-------|
| `--eig-space-1` | 8px |
| `--eig-space-2` | 16px |
| `--eig-space-3` | 24px |

Dashboard grids use `gap-2` (8px) for KPI/domain density; sections `space-y-6` (24px).

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `--eig-radius-sm` | 6px | Buttons, badges |
| `--eig-radius-md` | 8px | Panels |
| `--eig-radius-lg` | 10px | KPI cards, glass |

## Status colors

| Token | Hex | Semantic |
|-------|-----|----------|
| `--eig-success` | `#34d399` | Healthy |
| `--eig-warning` | `#fbbf24` | Degraded / watch |
| `--eig-danger` | `#f87171` | Critical |
| `--eig-info` | `#38bdf8` | Informational |

`StatusBadge` maps `healthy`, `degraded`, `critical`, `unknown`, severity strings.

## Motion

| Token | Duration | Use |
|-------|----------|-----|
| `--eig-motion-fast` | 120ms | Hover, nav |
| `--eig-motion-base` | 180ms | Page enter, cards |
| `--eig-motion-emphasis` | 220ms | Shimmer |

Disabled when `prefers-reduced-motion: reduce`.

## Layout chrome

| Token | Value |
|-------|-------|
| `--eig-sidebar-width` | 240px |
| `--eig-header-height` | 56px |
