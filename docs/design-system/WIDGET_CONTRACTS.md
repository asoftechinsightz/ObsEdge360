# Widget Contracts

Source: `packages/shared-types/src/widgets.ts`  
Renderers: `apps/web/src/components/dashboard/widgets/`

## Mapping

| Contract | Renderer | Dashboard section |
|----------|----------|---------------------|
| `HealthWidget` | `HealthWidgetView` → `MetricCard` | Executive health |
| `DomainWidget` | `DomainWidgetView` → `DomainCard` | Operational domains |
| `RiskWidget` | `RiskWidgetsPanel` | Intelligence |
| `RecommendationWidget` | `RecommendationWidgetsPanel` | Intelligence |
| `SecurityWidget` | `SecurityWidgetView` | Intelligence + domain.security |
| `ComplianceWidget` | `ComplianceWidgetView` | Intelligence + domain.compliance |
| `TableWidget` | `TableWidgetView` | Affected services |
| `IncidentWidget` | `IncidentWidgetsPanel` | Recent incidents |
| `ActionWidget` | `ActionWidgetsGrid` → `ActionCard` | Recommended actions |
| `TrendWidget` | `TrendWidgetSummary` | Trends (context line) |
| `ChartWidget` | `ChartWidgetsLazy` | Trends (charts) |
| `TimelineWidget` | *Reserved* — renderer TBD Wave 3+ |
| `TopologyWidget` | *Reserved* |

## HealthWidget (required fields)

```typescript
{
  id, title, category: 'health', status,
  score: number | string,
  trend?, sparkline?, drilldown?, unit?, metadata?
}
```

## DomainWidget

```typescript
{
  id, title, category, status, summary,
  count?, countLabel?, drilldown?, metadata?
}
```

## ActionWidget

```typescript
{
  id, title, description, href, cta, category: 'action', priority?, permission?
}
```

## Adding a new widget

1. Add interface to `packages/shared-types/src/widgets.ts`  
2. Populate in `ExecutiveDataService.composeDashboard()`  
3. Add renderer in `WidgetViews.tsx`  
4. Register in `WidgetRenderer.tsx`  
5. Add layout slot in `dashboard-layout.ts` + backend `WidgetRegistryService`  
6. Document in `COMPONENT_CATALOGUE.md`

No page-specific JSON — ever.
