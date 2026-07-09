<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# Technical Debt Report

## High

1. AWS/K8s discovery connectors return mock inventory
2. Remediation engine returns `simulated_success`
3. AI agents use template responses; LangGraph LLM placeholder
4. Prod compose excludes 4 microservices
5. In-memory auth rate limit and SSO state

## Medium

6. OTLP/logs in PostgreSQL — scale risk
7. OpenSearch optional; security plugin disabled in dev
8. Legacy `@trinetra360` symlinks in node_modules until reinstall
9. Helm chart still named `trinetra360`
10. Test coverage below NFR target

## Low

11. Stale `.next` artifacts with old branding
12. Folder path still `Observability360` on disk
