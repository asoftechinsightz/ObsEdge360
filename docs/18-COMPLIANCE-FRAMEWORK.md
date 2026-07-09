# OpsEdge360 — Compliance Framework

**Version:** 1.0

---

## 1. Supported Frameworks

| Code | Framework | Industry |
|------|-----------|----------|
| ISO27001 | ISO/IEC 27001:2022 | All |
| ISO20000 | ISO/IEC 20000 | IT Service Management |
| ISO22301 | ISO/IEC 22301 | Business Continuity |
| NIST-CSF | NIST Cybersecurity Framework 2.0 | All |
| CIS | CIS Benchmarks | Infrastructure |
| SOC2 | SOC 2 Type II | SaaS |
| PCI-DSS | PCI DSS 4.0 | Payments |
| GDPR | EU GDPR | Data Privacy |
| HIPAA | HIPAA | Healthcare |
| COBIT | COBIT 2019 | Governance |
| ITIL | ITIL 4 | Service Management |
| RBI-CSF | RBI Cyber Security Framework | Indian BFSI |
| NPCI | NPCI Security Guidelines | Payments (India) |
| SWIFT-CSP | SWIFT Customer Security Programme | Banking |

## 2. Control Validation Model

Each control defines:
- `control_id` — e.g. ISO27001-A.8.1
- `title` — Human-readable name
- `validation_query` — JSON query against CMDB/observability
- `evidence_requirements` — What artifacts to collect
- `severity` — critical, high, medium, low

## 3. Validation Query Example

```json
{
  "type": "cmdb_query",
  "filter": {
    "ci_type": "database",
    "attributes.encryption_at_rest": { "$ne": true }
  },
  "pass_condition": "count == 0",
  "message": "All databases must have encryption at rest enabled"
}
```

## 4. Continuous Compliance Flow

1. Scheduler triggers check (hourly/daily per control)
2. Compliance service executes validation query
3. Results stored in `compliance_checks`
4. Violations emit `compliance.violation` Kafka event
5. Evidence auto-collected and linked to CIs
6. Compliance Agent proposes remediation
7. Dashboard updated with framework score

## 5. Scoring

```
Framework Score = (passed_controls / total_applicable_controls) * 100
CI Compliance Score = weighted average of applicable control results
Tenant Score = aggregate across enabled frameworks
```

## 6. Evidence Collection

| Evidence Type | Source | Retention |
|---------------|--------|-----------|
| Config snapshot | CMDB attributes | 7 years |
| Access log excerpt | OpenSearch | Per policy |
| Patch status | Discovery connector | 1 year |
| Certificate expiry | Discovery | Until renewed |

## 7. Audit Export

`GET /api/v1/compliance/export?framework=ISO27001&format=pdf|csv`

Includes: control status, evidence links, violation history, remediation actions.

## 8. Policy Drift Detection

Compare current CI state against last-known compliant state; alert on unauthorized changes to security-critical attributes.

## 9. Framework Packs

Industry packs bundle frameworks + pre-tuned controls:
- **BFSI Pack**: RBI-CSF, NPCI, PCI-DSS, SWIFT-CSP
- **Healthcare Pack**: HIPAA, ISO27001
- **Manufacturing Pack**: ISO27001, OT safety controls
