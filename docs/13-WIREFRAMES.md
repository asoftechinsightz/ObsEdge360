# OpsEdge360 — Dashboard Wireframes

**Version:** 1.0

---

## 1. Executive Home (CIO View)

```
┌─────────────────────────────────────────────────────────────────┐
│ Enterprise Health Overview                          [Last 24h ▼] │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────┤
│ Availability│ Revenue Risk│ Compliance  │ Security    │ Sustain.  │
│   99.94%    │  ₹2.4L/hr   │   87/100    │  Medium     │  72/100   │
│   ▲ 0.02%   │  ▼ 12%      │   ▲ 3       │  3 critical │  ▲ 5      │
├─────────────┴─────────────┴─────────────┴─────────────┴───────────┤
│ [Service Health Map - treemap by tier]  │ [Top 5 Risks - list]    │
├─────────────────────────────────────────┼─────────────────────────┤
│ [SLA Trend - line chart 7d]             │ [Active Incidents - 4]  │
└─────────────────────────────────────────┴─────────────────────────┘
```

## 2. Digital Twin

```
┌─────────────────────────────────────────────────────────────────┐
│ Digital Twin    [IT] [OT] [Network] [Security] [Business]  🔍   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     [UPI Payments]──────[API Gateway]──────[Auth Service]       │
│            │                    │                  │            │
│            ▼                    ▼                  ▼            │
│     [Payment MS]────────[Kafka]────────[PostgreSQL]             │
│            │                                       │            │
│            └──────────────[Network Core]─────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Selected: payment-api │ Health: 92 │ Risk: Low │ [View CI]      │
└─────────────────────────────────────────────────────────────────┘
```

## 3. CMDB Explorer

```
┌─────────────────────────────────────────────────────────────────┐
│ CMDB Explorer                              [+ Add] [Export]      │
├──────────────────┬──────────────────────────────────────────────┤
│ Filters          │  Name          Type      Health  Compliance  │
│ □ Server         │  web-01        server    98      95          │
│ □ VM             │  db-primary    database  72 ⚠    88          │
│ □ Database       │  k8s-prod      cluster   95      91          │
│ □ Network        │  fw-edge-01    firewall  100     82          │
│ Search: [____]   │  ...                                           │
└──────────────────┴──────────────────────────────────────────────┘
```

## 4. Business Transaction View

```
┌─────────────────────────────────────────────────────────────────┐
│ Transaction: UPI Payment                           p99: 1.2s     │
├─────────────────────────────────────────────────────────────────┤
│ Customer → Mobile → Gateway → Auth → Payment → DB → NPCI       │
│   ✓         ✓        ✓        ✓       ⚠ 890ms    ✓      ✓      │
├─────────────────────────────────────────────────────────────────┤
│ [Trace Timeline ─────────────────────────────────────────────]  │
│ [Correlated Logs] [Metrics] [Related Alerts: 1]                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. CISO Security Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Security Posture                                    Score: 78/100 │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ Threats     │ Fraud Alerts│ Vulnerab.   │ Compliance Violations │
│ 12 active   │ 3 new       │ 47 open     │ 8 critical            │
├─────────────┴─────────────┴─────────────┴─────────────────────────┤
│ [Attack Surface Map]              │ [Anomaly Timeline]            │
│ [SIEM Correlation Feed]           │ [Top Insider Risk Users]      │
└───────────────────────────────────┴───────────────────────────────┘
```

## 6. Compliance Officer View

```
┌─────────────────────────────────────────────────────────────────┐
│ Compliance Dashboard                    Framework: [ISO27001 ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ Overall: 87%  │ Passed: 142 │ Failed: 18 │ Pending Evidence: 5 │
├─────────────────────────────────────────────────────────────────┤
│ Control ID    Title                    Status    Last Check       │
│ A.8.1         Asset inventory          ✓ Pass    2h ago           │
│ A.8.2         Asset ownership          ⚠ Partial 2h ago          │
│ A.10.1        Crypto controls          ✗ Fail    2h ago           │
├─────────────────────────────────────────────────────────────────┤
│ [Export Audit Package]  [Schedule Review]  [AI Remediation Plan]  │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Agent Activity Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Agents                                        [Approval Queue]│
├─────────────────────────────────────────────────────────────────┤
│ ● RCA Agent      │ Hypothesis: DB connection pool exhausted     │
│   2 min ago      │ Confidence: 87% │ [View Evidence] [Approve]   │
│ ● Discovery Agent│ New relationship: api-gw → payment-svc       │
│   5 min ago      │ Confidence: 94% │ Auto-applied               │
└─────────────────────────────────────────────────────────────────┘
```

Implementation: `apps/web/src/app/(dashboard)/`
