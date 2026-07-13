# Component Catalogue

All enterprise components used on Executive Dashboard and shell.

---

## Layout & chrome

### `DashboardShell`
**Path:** `components/DashboardShell.tsx`  
**Purpose:** Fixed header, collapsible sidebar, command palette, copilot drawer  
**States:** Mobile drawer, collapsed sidebar, presentation mode, debug nav  
**A11y:** Skip link, `aria-label` on nav, keyboard command palette (Ctrl+K)

### `SectionHeader`
**Purpose:** Section title with optional eyebrow, description, actions  
**Props:** `id`, `eyebrow`, `title`, `description`, `actions`  
**A11y:** `id` links to parent `section[aria-labelledby]`

### `PanelHeader`
**Purpose:** Inset panel title (intelligence sub-panels)  
**Props:** `title`, `description`, `action`

### `StoryBridge`
**Purpose:** One-line narrative between dashboard sections  
**Props:** `children`

### `PageHeader`
**Purpose:** Tier-A page titles (CMDB, Security, etc.)  
**Props:** `title`, `purpose`, `actions`, `meta`

---

## Data display

### `MetricCard` / `HealthWidgetView`
**Widget contract:** `HealthWidget`  
**Props:** `label`, `value`, `trend`, `status`, `href`, `sparkline`, `hint`  
**States:** Link drill-down, status dot, sparkline empty  
**A11y:** `aria-label` on linked cards  
**Extension:** SSE refresh via `metadata.streamChannel`

### `DomainCard` / `DomainWidgetView`
**Widget contract:** `DomainWidget`  
**Props:** `title`, `summary`, `status`, `href`, `meta`, `criticalCount`, `warningCount`, `healthLabel`  
**States:** Security/compliance enrichment from sibling widgets

### `ActionCard` / `ActionWidgetsGrid`
**Widget contract:** `ActionWidget`  
**Props:** `title`, `description`, `href`, `cta`  
**Behavior:** Dedupes by `href`, max 8 visible

### `StatusBadge`
**Props:** `status` string  
**Maps:** healthy, degraded, critical, severity levels

### `DataTable` / `TableWidgetView`
**Widget contract:** `TableWidget`  
**Props:** `columns`, `rows`  
**A11y:** `aria-label` on table

### `MiniSparkline`
**Props:** `values: number[]`  
**A11y:** `aria-hidden` (decorative; value in card label)

---

## Charts

### `ChartWidgets` / `ChartWidgetsLazy`
**Widget contract:** `ChartWidget[]`  
**Props:** `charts`, `dataMode`  
**Performance:** Dynamic import, `ssr: false`  
**States:** Skeleton while loading Recharts

---

## Intelligence panels

### `RiskWidgetsPanel`
**Contract:** `RiskWidget[]`  
**Empty:** `DemoAwareEmptyState`

### `RecommendationWidgetsPanel`
**Contract:** `RecommendationWidget[]`

### `SecurityWidgetView`
**Contract:** `SecurityWidget` — critical/warning/healthy counts

### `ComplianceWidgetView`
**Contract:** `ComplianceWidget`

### `IncidentWidgetsPanel`
**Contract:** `IncidentWidget[]`

---

## Trust & narrative

### `TrustBar`
**Props:** `lastUpdated`, `freshness`, `dataSource`, `coverageLabel`, `aiConfidence`  
**A11y:** `role="status"`

### `ExecutiveNarrative`
**Props:** happening, why, impact, nextAction, aiConfidence

### `ExecutiveBriefing`
**Purpose:** Composes TrustBar + Narrative + InlineAiAssist from payload (no fetch)

---

## Actions & inputs

### `Button`
**Variants:** primary, secondary, ghost, danger  
**Sizes:** sm, md  
**Supports:** `href` for link-styled buttons

### `EigTabs`
**Props:** `tabs`, `active`, `onChange`  
**A11y:** `role="tablist"`, `aria-selected`

---

## Feedback states

### `LoadingSkeleton` / `DashboardLoadingState`
**Path:** `UiStates.tsx`, `DashboardStates.tsx`

### `EmptyState` / `DemoAwareEmptyState`
**Purpose:** Demo-aware empty with CTA to guided eval

### `ErrorState` / `DashboardErrorState`
**Props:** `message`, `onRetry`

### `DashboardCachedBadge`
**Shows when `metadata.cacheHit`

---

## Shell utilities

### `ThemeToggle` — light/dark via `data-theme`  
### `QuickActions` — header dropdown  
### `OrgContextBadge` — tenant context link  
### `Breadcrumbs` — path labels from `nav-config`  
### `NotificationCenter` — `/me/notifications`

---

## Widget dispatcher

### `WidgetRenderer`
**Path:** `components/dashboard/WidgetRenderer.tsx`  
**Purpose:** Map contract type → renderer; add new types here only

---

## Deprecated (retain for BC)

| Component | Replacement |
|-----------|-------------|
| `KpiGrid` | `HealthWidget[]` |
| `RiskList` | `insights.topRisks` |
| `ServiceHealthTable` | `TableWidget` |
| `AiRecommendations` | `insights.aiRecommendations` |
| `ExecutiveHomeApex` | `ExecutiveBriefing` |
| `ExecutiveTrendCharts` (self-fetch) | `ChartWidgetsLazy` |
