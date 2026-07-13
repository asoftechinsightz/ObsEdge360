# Sprint 1 Release Notes — Executive Command Center

**Phase:** 3  
**Sprint:** 1  
**Date:** 2026-07-13  
**Product:** OpsEdge360 · Powered by AsoftechInsightz

## Summary

Production-quality hardening of the Executive Command Center so Journey A starts with business outcomes, real incident deep-links, and honest empty/loading states.

## Delivered

| Area | Change |
|------|--------|
| Gateway | Real `ops_incidents` feed into executive dashboard; twin deep-links for services |
| Gateway | Honest KPI failure fallback (no fake populated estate) |
| Gateway | Health widget order: business → revenue → broken → overall… |
| Web | Removed client-hardcoded action cards (backend SSOT) |
| Web | Login role landing bug fixed (role string vs path) |
| Web | Twin `focus`/`name` query support for impact workflow |
| Web | Transactions `?service=` focus + Suspense |
| Web | `/dashboard/loading.tsx` skeleton |
| Tests | Aggregation compose tests + layout order tests |

## Acceptance

| ID | Status |
|----|--------|
| S1-AC1 Exec lands on `/dashboard` | PASS (landing + login fix) |
| S1-AC2 Single-fetch aggregator | PASS |
| S1-AC3 Business-outcome KPIs first | PASS |
| S1-AC4 Real action workflows | PASS |
| S1-AC5 Service drill | PASS → Twin impact |
| S1-AC6 Real incident IDs | PASS (when incidents exist in tenant) |
| S1-AC7 Loading/empty honesty | PASS |
| S1-AC8 Unit tests | PASS |
| S1-AC9 No vendor branding | PASS |

## Deployment

1. Deploy `api-gateway` + `web`  
2. Recreate **nginx** after gateway/web recreate (sticky upstream IPs)  
3. Ensure EDE pack loaded for demo tenants  
4. Smoke: `GET /api/v1/dashboard/executive?role=cio`

## Rollback

Redeploy previous gateway/web images; restore prior nginx if needed.

## Known issues

See `SPRINT1_KNOWN_ISSUES.md`.
