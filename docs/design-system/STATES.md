# UI States

## Dashboard states

| State | Trigger | Component | Appearance |
|-------|---------|-----------|------------|
| **Loading** | Server pending / chart lazy | `DashboardLoadingState`, chart skeleton | Shimmer rows |
| **Empty** | No health + no assets | `DemoAwareEmptyState` | Dashed panel + guided eval CTA |
| **Error** | API failure | `DashboardErrorState` | Red panel + retry + guided link |
| **Success** | Normal render | Full dashboard | — |
| **Cached** | `metadata.cacheHit` | `DashboardCachedBadge` | Subtle "Cached" chip |
| **Illustrative** | `dataMode: illustrative` | TrustBar label | "Illustrative Demo Data" |
| **Refreshing** | *Future* SSE/poll | Not implemented | Wave 5 |
| **Offline** | *Future* | Not implemented | Wave 5 |
| **Permission denied** | *Future* 403 envelope | Not implemented | Wave 3 RBAC nav |

## Shell states

| State | Component |
|-------|-----------|
| Demo pack not loaded | `DemoDataBanner` |
| Non-prod environment | `EnvironmentBanner` |
| Presentation mode | Apex chrome hidden |

## Status semantics (from backend only)

| Status | Color family | Use |
|--------|--------------|-----|
| `healthy` | Emerald | Within SLA |
| `degraded` | Amber | Watch |
| `critical` | Red | Executive action required |
| `unknown` | Slate | Awaiting data |

Frontend must **never** recalculate status.

## Empty state copy standards

- Title: what is missing (factual)  
- Hint: one action ("Load Illustrative Demo Data…")  
- CTA: link to `/demo/guided` or relevant workspace
