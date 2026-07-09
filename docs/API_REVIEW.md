<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# API Review

## Gateway

NestJS on port 4000. Global prefix `/api/v1`. OpenAPI at `/api/docs`.

## Controllers (21)

Health, Auth, SSO, Copilot, Executive, CMDB, Discovery, Twin, Compliance, Agents, Observability, Transactions, Network, Security, Remediation, Sustainability, Analytics, Quantum, Governance, Platform.

## Auth endpoints

- `POST /auth/login`, `POST /auth/signup`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /auth/me`
- SSO: OIDC/SAML start + callback

## Proxy

Axios to microservices with `PROXY_TIMEOUT_MS` (default 5000ms), `X-Tenant-ID` header.

## Spec

`openapi/trinetra360-v1.yaml` — filename legacy; content should be updated to OpsEdge360 examples.
