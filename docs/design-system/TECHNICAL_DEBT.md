# Technical Debt Assessment

## Legacy dashboard widgets (deprecated, unused on `/dashboard`)

| File | Status | Action |
|------|--------|--------|
| `KpiGrid.tsx` | @deprecated | Remove after Wave 4 if no imports |
| `RiskList.tsx` | @deprecated | Same |
| `ServiceHealthTable.tsx` | @deprecated | Same |
| `AiRecommendations.tsx` | @deprecated | Same |
| `ExecutiveHomeApex.tsx` | Props-only shim | Remove after import audit |
| `SlaChart.tsx` | No-op export | Remove |

## Duplicate styling

| Issue | Location | Fix |
|-------|----------|-----|
| Panel headers inline vs `PanelHeader` | Fixed Wave 2.5 on dashboard | Apply to Tier-A pages |
| `rounded-2xl` vs `eig-radius-*` on some empty states | `UiStates.tsx` | Align to tokens in Tier-A pass |
| `eig-glass` vs `eig-panel` mixed on old pages | Various | Standardize per component catalogue |

## Duplicate utilities

| Utility | Notes |
|---------|-------|
| `fetchApi` vs `fetchDashboardExecutive` | Correct split — keep both |
| `apiClient` vs `fetchApi` | Client vs server — document in README |

## Frontend business logic (remaining)

| Item | Location | Target |
|------|----------|--------|
| Hardcoded `priorityActions` | `ExecutiveDashboardClient.tsx` | Move to backend `recommendedActions` |
| Action dedup by href | Client | Acceptable presentation logic |

## Deprecated APIs (still required)

| API | Reason |
|-----|--------|
| `/executive/*` | Backward compatibility, Copilot |
| Legacy widget components | No breaking removal until Wave 4 |

## Missing Wave 3 items (not debt — planned)

- Backend-driven navigation  
- Tenant config bootstrap  
- Unified envelope on all routes  
- Permission-gated nav items

## Cleanup recommendations (non-breaking)

1. Add `legacy/README.md` listing deprecated components  
2. ESLint rule or grep CI check: no `/executive/` imports in `dashboard/`  
3. Archive unused widgets to `components/legacy/` in Wave 4  
4. Consolidate empty states into `DemoAwareEmptyState` + `EmptyState` only

## Debt score: **Low–Medium** (contained, documented)
