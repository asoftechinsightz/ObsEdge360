# 13 — Component Inventory

## Shell & navigation

| Component | Path | Role |
|-----------|------|------|
| DashboardShell | `apps/web/src/components/DashboardShell.tsx` | Primary chrome + CORE_NAV |
| CommandPalette | `apps/web/src/components/CommandPalette.tsx` | Ctrl/Cmd+K |
| Breadcrumbs | `apps/web/src/components/Breadcrumbs.tsx` | Path crumbs |
| AdminShell | `apps/web/src/app/admin/AdminShell.tsx` | Admin page frame |
| AdminNav | `apps/web/src/app/admin/AdminNav.tsx` | Admin chip groups |
| EnvironmentBanner | `apps/web/src/components/EnvironmentBanner.tsx` | Non-prod banner |
| CopilotPanel | `apps/web/src/components/CopilotPanel.tsx` | AI slide-over |
| NotificationCenter | `apps/web/src/components/NotificationCenter.tsx` | Bell menu |

## Executive dashboard widgets

| Component | Path |
|-----------|------|
| KpiGrid | `apps/web/src/components/KpiGrid.tsx` |
| ServiceHealthTable | `apps/web/src/components/ServiceHealthTable.tsx` |
| RiskList | `apps/web/src/components/RiskList.tsx` |
| SlaChart | `apps/web/src/components/SlaChart.tsx` |

## UI states

| Component | Path |
|-----------|------|
| LoadingSkeleton | `apps/web/src/components/UiStates.tsx` |
| EmptyState | same |
| ErrorState | same |
| SuccessBanner | same |

## Domain

| Component | Path |
|-----------|------|
| ConnectorWizard | `apps/web/src/components/discovery/ConnectorWizard.tsx` |

## Libraries

| Library | Use |
|---------|-----|
| recharts | Charts (SLA) |
| cytoscape | Twin, topology, service map, transactions |
| lucide-react | Icons |
| clsx | classNames |
| Tailwind CSS 3 | Styling |
| Next.js 14 | App Router |

## Missing primitives (to add)

PageHeader · StatusBadge · DataTable · MetricCard · DescriptionList · Panel · Button · FormField · Drawer/Modal · Timeline · ErrorBoundary · JsonViewer (debug) · NavSection · Favorites/Recents hooks

## Duplication hotspots

- Ad-hoc tables and card layouts across admin pages  
- Repeated JSON dump blocks  
- Parallel nav lists (sidebar vs palette) not DRY
