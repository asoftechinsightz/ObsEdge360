#!/usr/bin/env node
/**
 * Generates Phase 0A review docs, Phase 0D governance docs, and archive.
 * Run: node scripts/generate-phase0-docs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const gov = path.join(docs, 'governance');
const archive = path.join(docs, 'archive');

const META = {
  product: 'OpsEdge360',
  brand: 'Powered by AsoftechInsightz',
  scope: '@opsedge360/*',
  version: '1.0.0',
  date: '2026-07-06',
  domain: 'observability360.asoftechinsightz.com',
  apiDomain: 'api.observability360.asoftechinsightz.com',
  db: 'trinetra360',
  completion: '~58%',
  prodReadiness: '7/10',
  securityMaturity: '4.5/10',
  aiReadiness: '3.5/10',
};

function write(rel, body) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const header = `<!-- Generated Phase 0 — ${META.date} — ${META.product} -->\n\n`;
  fs.writeFileSync(full, header + body.trim() + '\n', 'utf8');
  console.log('wrote', rel);
}

// Phase 0A docs
const phase0a = {
  EXECUTIVE_REVIEW: `# Executive Review — ${META.product}

**Brand:** ${META.brand}  
**Date:** ${META.date}  
**Phase:** 0A Architecture Review

## Summary

${META.product} is an enterprise Digital Operations Intelligence Platform rebranded from Observability360/Trinetra360. The monorepo delivers 12 microservices, a Next.js executive dashboard, NestJS API gateway, optional Python AI agents, and a universal host agent.

## Key findings

| Dimension | Score | Notes |
|-----------|-------|-------|
| Vision vs delivery | ${META.completion} | Strong CMDB/observability/compliance; simulated remediation & cloud discovery |
| Production readiness | ${META.prodReadiness} | VPS stable; prod compose runs 6/12 services |
| Security maturity | ${META.securityMaturity} | JWT auth + SSO; RBAC/MFA/mTLS gaps |
| AI readiness | ${META.aiReadiness} | Rule-based copilot; template AI agents |

## Recommendation

Complete Phase 0 rebrand on laptop, validate via release gate, then deploy to VPS. Defer Sprint 0 feature work until governance docs and integrity checks pass.`,

  PRODUCT_AUDIT_REPORT: `# Product Audit Report — ${META.product}

## Identity

- **Product name:** ${META.product}
- **npm scope:** ${META.scope}
- **Agent binary:** \`opsedge360-agent\`
- **Production URL:** https://${META.domain} (domain unchanged per locked decision)

## Module inventory

| Module | GA status | Production compose |
|--------|-----------|-------------------|
| Discovery | Implemented (partial live connectors) | Yes |
| CMDB | Implemented | Yes |
| Observability | Implemented | Yes |
| Compliance | Implemented | Yes |
| Transactions | Implemented | Yes |
| Security | Implemented (heuristic) | Yes |
| Remediation | Simulated execution | Dev only |
| Analytics | Heuristic forecasts | Dev only |
| Quantum | Inventory/scoring | Dev only |
| Governance | Metadata/HA scoring | Dev only |
| AI Agents | Template responses | Optional |
| Host Agent | Implemented | Via API |

## UI routes (25)

Marketing, auth (login/signup/forgot/reset), dashboard, discovery, CMDB, twin, transactions, observability, APM, network, OT, security, compliance, Banking360, sustainability, analytics, quantum, governance, agents, SSO settings.`,

  ARCHITECTURE_REVIEW: `# Architecture Review — ${META.product}

## Pattern

Modular monorepo with NestJS API gateway (BFF), Express microservices, shared packages (\`shared-db\`, \`event-bus\`, \`cache\`, \`platform-config\`, \`shared-types\`), PostgreSQL as system of record.

## Request flow

\`\`\`
Browser → nginx → web (Next.js) → api-gateway → microservice → PostgreSQL/Redis/Kafka
\`\`\`

## Deployment modes

\`DEPLOYMENT_MODE\`: saas | hybrid | onprem  
\`PERFORMANCE_PROFILE\`: local | standard | high (pool sizing)

## Gaps

- 4 microservices not in prod compose
- Neo4j/OpenSearch/Mongo optional, often disabled in prod
- No service mesh / mTLS`,

  MODULE_STATUS_MATRIX: `# Module Status Matrix

| Module | Port | Code | DB | UI | Prod | Notes |
|--------|------|------|----|----|------|-------|
| Web | 3000 | ✅ | — | ✅ | ✅ | Next.js 14 |
| API Gateway | 4000 | ✅ | ✅ | — | ✅ | Auth, SSO, proxy |
| Discovery | 4001 | ✅ | ✅ | ✅ | ✅ | AWS/K8s mock |
| CMDB | 4002 | ✅ | ✅ | ✅ | ✅ | Neo4j optional |
| Observability | 4003 | ✅ | ✅ | ✅ | ✅ | OTLP in Postgres |
| Compliance | 4004 | ✅ | ✅ | ✅ | ✅ | Framework packs |
| Transactions | 4005 | ✅ | ✅ | ✅ | ✅ | SLOs, flows |
| Security | 4006 | ✅ | ✅ | ✅ | ✅ | σ anomalies |
| Remediation | 4007 | ✅ | ✅ | ✅ | ❌ | Simulated runbooks |
| Analytics | 4008 | ✅ | ✅ | ✅ | ❌ | prophet-lite |
| Quantum | 4009 | ✅ | ✅ | ✅ | ❌ | No live QPU |
| Governance | 4010 | ✅ | ✅ | ✅ | ❌ | FedRAMP inventory |
| AI Agents | 5000 | ⚠️ | ✅ | — | ❌ | Template LLM |
| Host Agent | — | ✅ | — | ✅ | ✅ | X-Agent-Key |`,

  TECHNICAL_DEBT_REPORT: `# Technical Debt Report

## High

1. AWS/K8s discovery connectors return mock inventory
2. Remediation engine returns \`simulated_success\`
3. AI agents use template responses; LangGraph LLM placeholder
4. Prod compose excludes 4 microservices
5. In-memory auth rate limit and SSO state

## Medium

6. OTLP/logs in PostgreSQL — scale risk
7. OpenSearch optional; security plugin disabled in dev
8. Legacy \`@trinetra360\` symlinks in node_modules until reinstall
9. Helm chart still named \`trinetra360\`
10. Test coverage below NFR target

## Low

11. Stale \`.next\` artifacts with old branding
12. Folder path still \`Observability360\` on disk`,

  SECURITY_REVIEW: `# Security Review

## Implemented

- JWT bearer auth (HS256), signup/login, forgot/reset password
- SSO OIDC + SAML
- Auth rate limit (20/min/IP+email, in-memory)
- CORS allowlist, security headers, DTO validation
- Tenant isolation via JWT \`tenantId\` + query filters
- \`audit_log\` table

## Gaps

| Control | Target | Actual |
|---------|--------|--------|
| RBAC | Role guards on all routes | Admin-only on SSO CRUD |
| MFA | Admin MFA | Not implemented |
| JWT | RS256, short TTL | HS256, 24h default |
| mTLS | Service-to-service | Not implemented |
| RLS | Postgres policies | App-level only |
| WAF | Edge protection | Not deployed |
| Secrets | Vault/KMS | Environment variables |

**Maturity:** ${META.securityMaturity}`,

  DATABASE_REVIEW: `# Database Review

## Engine

PostgreSQL 16 — database \`${META.db}\` (name locked for production)

## Migrations

14 SQL files (001, 003–014) creating ~58 tables. Runner: \`database/migrations/run.js\`.

## Key domains

- Multi-tenant: \`tenants\`, \`users\`, \`password_reset_tokens\`
- CMDB: \`configuration_items\`, \`relationships\`
- Observability: \`otlp_spans\`, \`prometheus_*\`, \`alerts\`
- Compliance: \`compliance_*\`, \`tenant_frameworks\`
- Phase 3–4: fraud, remediation, quantum, HA/DR, FedRAMP

## Seeds

4 seed files with idempotent skip logic in runner.

## Recommendations

- Add Postgres RLS for tenant tables
- Partition high-volume telemetry tables
- Keep \`${META.db}\` name on VPS (locked)`,

  API_REVIEW: `# API Review

## Gateway

NestJS on port 4000. Global prefix \`/api/v1\`. OpenAPI at \`/api/docs\`.

## Controllers (21)

Health, Auth, SSO, Copilot, Executive, CMDB, Discovery, Twin, Compliance, Agents, Observability, Transactions, Network, Security, Remediation, Sustainability, Analytics, Quantum, Governance, Platform.

## Auth endpoints

- \`POST /auth/login\`, \`POST /auth/signup\`
- \`POST /auth/forgot-password\`, \`POST /auth/reset-password\`
- \`GET /auth/me\`
- SSO: OIDC/SAML start + callback

## Proxy

Axios to microservices with \`PROXY_TIMEOUT_MS\` (default 5000ms), \`X-Tenant-ID\` header.

## Spec

\`openapi/trinetra360-v1.yaml\` — filename legacy; content should be updated to OpsEdge360 examples.`,

  UI_UX_REVIEW: `# UI/UX Review

## Stack

Next.js 14 App Router, Tailwind design tokens (\`docs/12-DESIGN-SYSTEM.md\`).

## Auth UX

Login, signup, forgot-password, reset-password, SSO callback — consistent dark surface cards with OpsEdge360 branding.

## Dashboard

Executive KPIs, module side nav, copilot panel. Module pages map 1:1 to microservices.

## Gaps

- No MFA enrollment UI
- Limited role-based nav hiding
- Mobile responsiveness not formally tested
- Some marketing copy may reference legacy positioning`,

  AI_ARCHITECTURE_REVIEW: `# AI Architecture Review

## Components

1. **Python FastAPI** (\`ai-agents/\`, port 5000) — discovery, RCA, remediation, compliance, fraud, predictive agents
2. **NestJS Copilot** — rule-based fallbacks when agents unavailable
3. **agent_runs** table — persistence

## Maturity: ${META.aiReadiness}

- AI agent handlers return template summaries
- \`orchestrator.py\` LLM integration is placeholder
- Copilot uses heuristics for Banking360, RCA, recommendations

## Path forward

- Wire real LLM provider with tenant-scoped keys
- Enforce agent auth (not CORS \`*\`)
- Add observability for agent latency/cost`,

  UNIVERSAL_AGENT_REVIEW: `# Universal Agent Review — OpsEdge360 Universal Agent

## Binary

\`opsedge360-agent\` (\`agents/host-agent/bin/opsedge360-agent.js\`)

## Capabilities

- Registration with API using \`X-Agent-Key\`
- Heartbeat and host metrics collection
- Configurable interval / one-shot mode

## Gaps

- No auto-update channel
- Limited OT protocol collectors on host
- Agent key rotation not automated`,

  DISCOVERY_ENGINE_REVIEW: `# Discovery Engine Review

## Connectors

Static, SNMP, OPC-UA, Modbus, MQTT (config-driven), AWS/K8s (mock inventory).

## Features

Schedules, notifications, agent registry, protocol listing.

## Gaps

- Real AWS SDK / Kubernetes API integration
- Live OT protocol polling
- Credential vault for connector secrets`,

  CMDB_REVIEW: `# CMDB Review

## Features

CI CRUD, relationships, import/export, change history, optional Neo4j graph sync, Kafka ingest.

## Strengths

Core enterprise CMDB flows implemented with tenant isolation.

## Gaps

- Neo4j sync synchronous and optional
- No formal reconciliation with external CMDBs
- Health score heuristics basic`,

  CONFIGURATION_MANAGEMENT_REVIEW: `# Configuration Management Review

## Platform config

\`@opsedge360/platform-config\` — deployment mode and performance profile from environment.

## Service config

Per-service env vars for ports, DB, Redis, Kafka URLs.

## Gaps

- No centralized config server
- Secrets in \`.env\` files
- Helm values still under \`trinetra360\` chart name`,

  INDUSTRY_PACK_REVIEW: `# Industry Pack Review

## Packs

Seeded industry packs (BFSI, healthcare, retail, manufacturing) in migration 005.

## Banking360

Dedicated controls, payment flow templates, compliance validation in compliance service.

## Gaps

- Pack activation UX limited
- Custom pack authoring not self-service`,

  PERFORMANCE_REVIEW: `# Performance Review

## NFR targets

- p95 API <200ms read / <500ms write
- Dashboard <3s
- 100K events/sec telemetry

## Current

- Gateway proxy timeout 5s
- Connection pools by PERFORMANCE_PROFILE
- Redis/in-memory cache on executive paths
- OTLP in PostgreSQL — bottleneck at scale

## VPS experience

Dashboard was slow when microservices crashed (fixed via Dockerfile CMD). Now loads fast with healthy services.`,

  SCALABILITY_REVIEW: `# Scalability Review

## Horizontal

Stateless gateway/web/services — Helm HPA documented; prod compose single-replica.

## Event bus

Kafka for SaaS; HTTP fallback for on-prem lite.

## Stateful

PostgreSQL, Redis, Kafka are bottlenecks. Multi-region active-active post-GA per HA runbook.

## Capacity claims

1M+ CIs/tenant — not load-tested in repo.`,

  PRODUCTION_READINESS_REPORT: `# Production Readiness Report

## VPS status (working)

- URL: https://${META.domain}
- 12 containers Up after microservice Dockerfile fix
- Login verified for production tenant

## Laptop Phase 0

Rebrand to ${META.product}, auth fixes, forgot password, prod compose hardening.

## Release gate (10 items)

1. Build passes
2. Zero legacy refs in source (excl. archive)
3. Migrations including 014
4. Docker prod compose config valid
5. Auth flows tested
6. 24 review docs present
7. 17 governance docs present
8. LEGACY_NAMES.md archived
9. REPOSITORY_INTEGRITY_REPORT
10. User approval before VPS deploy

**Score:** ${META.prodReadiness}`,

  PHASE0_GAP_ANALYSIS: `# Phase 0 Gap Analysis

## Completed in Phase 0B

- Full npm scope rebrand to \`@opsedge360/*\`
- Kafka image fix, microservice Dockerfile CMD
- Web port 3002 bind, signup SQL fix, seed fixes
- Forgot/reset password (API + UI + migration 014)
- Duplicate email signup block
- Prod compose restart + healthchecks

## Remaining post-Phase 0

- RBAC guards, MFA
- Real cloud discovery connectors
- Prod deployment of remediation/analytics/quantum/governance
- Helm chart rename
- Comprehensive test suite`,

  IMPLEMENTATION_ROADMAP: `# Implementation Roadmap

## Phase 0 (current)

0A Review docs → 0B Rebrand + fixes → 0C Validate → 0D Governance → Release gate → VPS

## Sprint 0 (blocked)

Platform foundation hardening after Phase 0 approval.

## Q3 2026

- RBAC + MFA
- Real remediation execution
- LLM-backed copilot
- Cloud discovery SDKs

## Q4 2026

- Multi-region HA
- OpenSearch default for logs
- Industry pack studio`,

  BRANDING_MIGRATION_REPORT: `# Branding Migration Report

## Locked

| Item | Value |
|------|-------|
| Product | OpsEdge360 |
| Domain | ${META.domain} |
| DB name | ${META.db} |
| Volume names | Unchanged |

## Migrated

- Root and workspace package names → \`@opsedge360/*\`
- UI strings → OpsEdge360
- Scripts \`obs360-*\` → \`opsedge360-*\`
- Agent binary → \`opsedge360-agent\`

## Intentional legacy

- DB/user defaults (\`trinetra\`, \`trinetra360\`)
- nginx upstream names (\`obs360_*\`)
- OpenAPI filename
- Helm chart path \`infra/helm/trinetra360\`

See \`docs/archive/LEGACY_NAMES.md\`.`,

  PACKAGE_NAMESPACE_REPORT: `# Package Namespace Report

## New scope

\`${META.scope}\` across apps, services, packages.

## Workspaces

\`apps/*\`, \`services/*\`, \`packages/*\`

## Action required

\`rm -rf node_modules && npm install\` to clear \`@trinetra360\` symlinks.

## CI

Update \`.github/workflows/ci-cd.yml\` image tags from \`trinetra360/*\` to \`opsedge360/*\`.`,

  DEPLOYMENT_IMPACT_REPORT: `# Deployment Impact Report

## VPS deploy (post-approval)

1. rsync laptop → \`/opt/observability360\` (exclude \`.env\`, certs)
2. Run \`scripts/apply-vps-patches.sh\`
3. \`docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod up -d --build\`

## Risk

Low if domain, DB name, volumes unchanged. Migration 014 adds password_reset_tokens (non-breaking).

## Rollback

Tag \`pre-opsedge360-phase0\`; revert branch; redeploy previous images.`,

  FINAL_REBRANDING_SUMMARY: `# Final Rebranding Summary — ${META.product}

**Date:** ${META.date}  
**Branch:** \`rebrand/opsedge360-phase-0b\`

## Status

Phase 0B code changes applied on laptop. Awaiting Phase 0C validation and release gate approval before VPS deploy.

## Checklist

- [x] Product name OpsEdge360
- [x] npm scope @opsedge360
- [x] Agent binary opsedge360-agent
- [x] Production domain unchanged
- [x] POSTGRES_DB trinetra360 unchanged
- [x] Forgot password flow
- [x] VPS Dockerfile/compose fixes in repo
- [ ] npm install + build green
- [ ] Legacy ref scan clean
- [ ] User approval for VPS

**Do not deploy VPS until this document is approved.**`,
};

for (const [name, body] of Object.entries(phase0a)) {
  write(`docs/${name}.md`, body);
}

// Governance docs
const governance = [
  'ENGINEERING_STANDARDS',
  'CODING_STANDARDS',
  'GIT_STRATEGY',
  'BRANCHING_POLICY',
  'RELEASE_POLICY',
  'VERSIONING_POLICY',
  'CHANGE_MANAGEMENT_POLICY',
  'SECURITY_POLICY',
  'CODE_REVIEW_POLICY',
  'API_STANDARDS',
  'DATABASE_STANDARDS',
  'DOCUMENTATION_STANDARDS',
  'TESTING_POLICY',
  'DEPLOYMENT_POLICY',
  'SUPPORT_POLICY',
  'RELEASE_CHECKLIST',
  'DEFINITION_OF_DONE',
];

const govBodies = {
  ENGINEERING_STANDARDS: 'Monorepo npm workspaces; TypeScript strict; NestJS gateway + Express services; shared packages for DB/cache/events; Docker-first local and prod.',
  CODING_STANDARDS: 'ESLint per package; Prettier defaults; no secrets in source; use @opsedge360 imports; match existing file layout.',
  GIT_STRATEGY: 'main protected; feature branches; milestone tags (pre-opsedge360-phase0); no force-push to main.',
  BRANCHING_POLICY: 'rebrand/* for Phase 0; sprint/* for features; hotfix/* for production fixes.',
  RELEASE_POLICY: 'Laptop validate → release gate → user approval → VPS deploy. Never skip gate.',
  VERSIONING_POLICY: 'SemVer 1.0.0 GA; tag releases opsedge360-vX.Y.Z.',
  CHANGE_MANAGEMENT_POLICY: 'Document breaking changes in RELEASE-NOTES; migrations idempotent via run.js.',
  SECURITY_POLICY: 'JWT_SECRET required in prod; AUTH_REQUIRED=true; CORS allowlist; pen-test items tracked in PENTEST-REMEDIATION.md.',
  CODE_REVIEW_POLICY: 'Two-person review for auth/infra changes; Bugbot on PRs when available.',
  API_STANDARDS: 'REST /api/v1; OpenAPI documented; DTO validation; consistent error shapes.',
  DATABASE_STANDARDS: 'Migrations numbered SQL; seeds idempotent; tenant_id on all tenant data; keep trinetra360 DB name in prod.',
  DOCUMENTATION_STANDARDS: 'Markdown in docs/; architecture in docs/architecture/; governance in docs/governance/.',
  TESTING_POLICY: 'smoke and retest scripts required before release; unit tests target 80% per NFR.',
  DEPLOYMENT_POLICY: 'docker compose prod profile; nginx TLS; backup before migrate; apply-vps-patches.sh on VPS.',
  SUPPORT_POLICY: 'Tier 1: login/dashboard; Tier 2: service logs; Tier 3: DB restore per BACKUP-RESTORE.md.',
  RELEASE_CHECKLIST: 'Build, migrate, smoke, ha:smoke, auth test, forgot password, dashboard <3s, 12 containers healthy.',
  DEFINITION_OF_DONE: 'Code merged, docs updated, tests/smoke pass, no P0 security regressions, approved by release gate.',
};

for (const name of governance) {
  write(`docs/governance/${name}.md`, `# ${name.replace(/_/g, ' ')}\n\n**Product:** ${META.product}\n**Date:** ${META.date}\n\n${govBodies[name]}`);
}

write('docs/archive/LEGACY_NAMES.md', `# Legacy Names Archive

Names retained intentionally for production compatibility.

| Legacy | Current context | Reason |
|--------|-----------------|--------|
| Observability360 | VPS path /opt/observability360, domain | Locked domain decision |
| Trinetra360 | POSTGRES_DB, Helm chart, OpenAPI file | DB/volume compatibility |
| trinetra | POSTGRES_USER default | Existing prod data |
| obs360_* | nginx upstream names | Internal only |
| MainStay_Vizor | Old folder name | Historical repo path |
| @trinetra360/* | Prior npm scope | Replaced by @opsedge360/* |

Do not rename production DB, domain, or Docker volumes without explicit migration plan.`);

write('docs/REPOSITORY_INTEGRITY_REPORT.md', `# Repository Integrity Report

**Date:** ${META.date}  
**Branch:** rebrand/opsedge360-phase-0b

## Scope

Post-rebrand integrity check for ${META.product} monorepo.

## Package namespace

- Root: opsedge360
- Workspaces: @opsedge360/* (apps, services, packages)

## Source legacy scan

Run: \`rg -i "trinetra360|@trinetra360|Observability360" --glob '!node_modules/**' --glob '!.next/**' --glob '!docs/archive/**'\`

Expected residual: DB defaults, deployment docs, OpenAPI filename, Helm paths.

## Migrations

001–014 wired in run.js including password_reset_tokens.

## Docker

- Kafka: bitnamilegacy/kafka:3.7.0-debian-12-r5
- Dockerfile.service CMD: node dist/index.js
- prod: restart unless-stopped, healthchecks

## Validation commands

\`\`\`bash
npm install && npm run build
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile core --profile prod config
\`\`\`

## Status

Pending npm install + build execution on laptop.`);

console.log('Phase 0 docs generated.');
