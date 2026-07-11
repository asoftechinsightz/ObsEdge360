# Wave 7 — Architecture

**Release:** `v1.0.0-wave7`  
**Purpose:** Certify Waves 1–6 under production architecture (no new product features).

```mermaid
flowchart LR
  UI["Certification Center UI"] --> API["/admin/system/certification"]
  Scripts["wave7-certify / chaos-ha"] --> API
  API --> DB["039 certification_* tables"]
  Scripts --> Live["Live API / Compose services"]
  API --> Reports["certification_reports"]
```

Suites: performance, load, ha, chaos, security, scalability, operational, reliability, reports.
