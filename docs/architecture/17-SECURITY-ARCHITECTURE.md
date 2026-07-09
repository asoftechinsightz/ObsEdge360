# OpsEdge360 — Security Architecture

**Version:** 1.0

---

## 1. Security Principles

- Zero Trust: never trust, always verify
- Defense in depth: network, application, data layers
- Least privilege: RBAC with minimal permissions
- Secure by default: encryption on, OT read-only
- Privacy by design: PII masking, data minimization

## 2. Identity & Access

| Layer | Mechanism |
|-------|-----------|
| User auth | OIDC/SAML SSO, MFA enforced for admin |
| API auth | JWT (RS256), short-lived access tokens |
| Service auth | mTLS between microservices |
| Agent auth | Service accounts with scoped API keys |

## 3. RBAC Model

| Role | Permissions |
|------|-------------|
| viewer | Read dashboards, CMDB |
| operator | + acknowledge alerts, trigger low-risk agents |
| admin | + configure connectors, manage users |
| compliance_officer | + compliance evidence, audit export |
| ot_engineer | + OT zone access, OT approvals |
| super_admin | Full tenant administration |

## 4. Data Security

| Store | Encryption | Access Control |
|-------|------------|----------------|
| PostgreSQL | AES-256 at rest (TDE) | Row-level security by tenant_id |
| Neo4j | Encrypted volumes | Tenant-scoped databases |
| OpenSearch | Encrypted indices | Index per tenant |
| Kafka | TLS + ACLs | Topic ACLs per service |
| Redis | TLS, AUTH | Namespace per tenant |

## 5. Network Security

```
Internet → WAF → Ingress (TLS 1.3) → API Gateway
                                      ↓ mTLS
                              Internal Services
                                      ↓
                              Data Tier (private subnet)
OT Edge Collector → one-way gateway → Observability (read-only)
```

## 6. Secrets Management

- HashiCorp Vault or cloud KMS
- Connector credentials rotated every 90 days
- No secrets in environment variables in production (Vault injection)

## 7. Audit & Compliance

- Immutable audit log (PostgreSQL append-only + S3 archival)
- All agent actions logged with actor, tool, outcome
- SIEM forward via syslog/API

## 8. Threat Model (STRIDE)

| Threat | Mitigation |
|--------|------------|
| Spoofing | MFA, mTLS, JWT validation |
| Tampering | Signed events, immutable audit |
| Repudiation | Comprehensive audit trail |
| Information disclosure | Encryption, tenant isolation |
| Denial of service | Rate limiting, HPA, circuit breakers |
| Elevation of privilege | RBAC, approval workflows |

## 9. Vulnerability Management

- Container image scanning (Trivy) in CI/CD
- Dependency scanning (Snyk/Dependabot)
- Quarterly penetration testing

## 10. Incident Response

1. Detect (fraud agent, SIEM correlation)
2. Contain (automated isolation with approval)
3. Eradicate (remediation agent)
4. Recover (runbook execution)
5. Lessons learned (RCA agent report)

## 11. OT Security

- OT collectors in isolated DMZ
- Read-only protocol access by default
- Rate limiting to prevent PLC overload
- Safety interlocks on any write-capable connector
