# Phase 1 Pre-Sign-Off Validation Checklist

**Status:** 🟡 Conditionally Approved — awaiting evidence  
**Rule:** Do **not** start Phase 2 until every section below is verified with evidence.  
**Related:** `PHASE1_COMPLETION_AUDIT.md`, `PHASE1_LESSONS_LEARNED.md`, `PHASE1_TEST_REPORT.md`

Legend: ☐ Pending · ☑ Done (attach evidence) · ✗ Failed · N/A

---

## 1. Functional validation

| Check | Status | Evidence (fill on staging/VPS) |
|-------|--------|--------------------------------|
| Gateway routes respond correctly | ☐ | `curl` matrix / smoke log |
| Topology APIs end-to-end | ☐ | `GET/POST /api/v1/cmdb/topology/{type}` |
| Pipeline APIs end-to-end | ☐ | sources + ingest with JWT |
| Agent config APIs authenticate correctly | ☐ | valid key 200; bad key 401 |
| Health endpoints respond correctly | ☐ | `/health` shows real up/down; `/ready` `/live` `/version` `/metrics` |
| No existing API regressions | ☐ | login, discovery list, CMDB cis, OTLP, heartbeat |

### Suggested smoke commands

```bash
# Health (public)
curl -sS "$API/api/v1/health" | jq .
curl -sS "$API/api/v1/ready" | jq .
curl -sS "$API/api/v1/version" | jq .

# Auth
TOKEN=$(curl -sS -X POST "$API/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}' | jq -r .accessToken)

# Topology
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/v1/cmdb/topology/application" | jq .
curl -sS -X POST -H "Authorization: Bearer $TOKEN" "$API/api/v1/cmdb/topology/application/refresh" | jq .

# Pipeline
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/v1/observability/pipeline/sources" | jq .

# Agent config (replace AGENT_ID / AGENT_KEY)
curl -sS -H "X-Agent-Key: $AGENT_KEY" "$API/api/v1/discovery/agents/$AGENT_ID/config" | jq .
curl -sS -o /dev/null -w "%{http_code}\n" -H "X-Agent-Key: invalid" \
  "$API/api/v1/discovery/agents/$AGENT_ID/config"   # expect 401

# Regression samples
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/v1/discovery/connectors" | jq .
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/v1/cmdb/cis" | jq .
```

**Laptop/CI note:** Unit/typecheck/build PASS does **not** satisfy this section. Staging or VPS required.

---

## 2. Production / deploy validation

| Check | Status | Evidence |
|-------|--------|----------|
| Docker Compose starts cleanly | ☐ | `docker compose ... up -d --build` log |
| All containers become healthy | ☐ | `docker compose ps` |
| No restart loops | ☐ | `docker inspect` / logs over 15+ min |
| NGINX routes correctly | ☐ | web + API hostnames |
| SSL certificates remain valid | ☐ | `openssl s_client` / browser |
| No database migration issues | ☐ | migrate job success; 001–014 untouched; 015 only if needed |
| Existing customers unaffected | ☐ | login + core dashboards for prod tenant |

**Production locks (must remain true):**

- Domains unchanged  
- DB name `trinetra360`  
- Nginx SSL / volume names unchanged  
- Migrations 001–014 not edited  

---

## 3. Performance validation

| Check | Status | Evidence |
|-------|--------|----------|
| API latency within expected limits | ☐ | p50/p95 for health + CMDB list + topology |
| No memory leaks (short soak) | ☐ | container mem over 30–60 min |
| CPU utilization acceptable | ☐ | `docker stats` under light load |
| Gateway stable under load | ☐ | simple load (e.g. `hey`/`k6`) on `/health` + authenticated read |

**Baseline targets (initial — tune after first run):**

| Endpoint | Target p95 |
|----------|------------|
| `GET /api/v1/health` | < 2s (includes probes) |
| `GET /api/v1/cmdb/cis` | < 1s (warm) |
| `GET /api/v1/cmdb/topology/application` | < 3s |

---

## 4. Security validation

| Check | Status | Evidence |
|-------|--------|----------|
| RBAC behavior unchanged (enforcement deferred) | ☐ | Same access as pre-Phase-1 for JWT users |
| Public endpoints limited to intended routes | ☐ | forgot/reset/login/signup/callback + agent key routes only |
| Agent keys validated correctly | ☐ | invalid key → 401 |
| No secrets exposed | ☐ | no secrets in logs, images, or client bundles |
| Trivy CRITICAL gate working | ☐ | CI config `exit-code: 1` for CRITICAL; sample pipeline run |

**Not in Phase 1 (expected):** full RBAC/ABAC enforcement — Phase 2.

---

## 5. Documentation validation

| Document | Path | Status |
|----------|------|--------|
| Phase 1 Completion Audit | `docs/phase1/PHASE1_COMPLETION_AUDIT.md` | ☐ Reviewed |
| Release Notes | `docs/phase1/PHASE1_RELEASE_NOTES.md` | ☐ Reviewed |
| Test Report | `docs/phase1/PHASE1_TEST_REPORT.md` | ☐ Reviewed |
| API Documentation | `docs/sprint0/SPRINT0_API.md` + `openapi/trinetra360-v1.yaml` + Swagger | ☐ Matches gateway |
| Architecture / frozen arch | `docs/governance/FROZEN_ARCHITECTURE.md` | ☐ Reviewed |
| ADR Index | `docs/adr/README.md` | ☐ Accepted ADRs listed |
| Deployment Guide | `docs/DEPLOY-VPS.md` (+ Phase 1 delta if any) | ☐ Deployable from clean env |
| Lessons Learned | `docs/phase1/PHASE1_LESSONS_LEARNED.md` | ☐ Reviewed |
| This checklist | `docs/phase1/PHASE1_PRE_SIGNOFF_CHECKLIST.md` | ☐ In progress |

---

## 6. Phase 2 approval conditions (hard gate)

Do **not** start Phase 2 until **all** are true:

1. ☐ All Phase 1 exit criteria **E1–E11** marked complete with evidence  
2. ☐ Staging smoke tests pass (Section 1)  
3. ☐ No critical or high-severity regressions identified  
4. ☐ Documentation accurately reflects implementation (Section 5)  
5. ☐ Platform is deployable from a clean environment using documented process (Section 2)  
6. ☐ Lessons Learned reviewed by Phase 2 lead  

---

## 7. Sign-off

| Role | Functional | Prod deploy | Perf | Security | Docs | Overall |
|------|------------|-------------|------|----------|------|---------|
| Product Owner | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ Approve Phase 2 |
| Chief Architect | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Security Architect | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| DevOps / SRE | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Current decision:** Phase 1 implementation **conditionally approved**. Phase 2 **not authorized**.
