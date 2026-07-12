# EDE v1.0 — Validation & Deliverables

**Git Commit SHA (tip):** `14ef7cd7dde175484ce8541902c828430800ff8a`  
**Feature commit:** `a01c7e8ff42a2750a251512a17bde78e40832b0a`  
**Production SHA:** `14ef7cd7dde175484ce8541902c828430800ff8a`  
**Validation token:** `EDE_V1_VALIDATION_OK`  
**Pack loaded at (UTC):** `2026-07-12T15:33:06Z`  
**Demo reset validation:** `POST /demo/ede/reset` → HTTP 201, `loaded=true`, `demoCiCount=3502`, `servers=1500`

## Demo tenant summary

| Item | Value |
|------|--------|
| Organization | Asoftech Global Bank (Demo) |
| Slug | `asoftech-global-bank-demo` |
| Admin | `cio@asoftech-global-bank.demo` / `Demo@OpsEdge360!2026` |
| Load | `POST /api/v1/demo/ede/load` (current tenant) or `/provision` |
| Reset | `POST /api/v1/demo/ede/reset` · UI `/demo` |
| Guided | `/demo/guided` |

Verified inventory after load: **3,502** EDE-tagged CIs; summary counts 25 / 350 / 1500 / 280 / 150 / 900 / 120 / 40 / 30.

## Screenshots

See [`screenshots/`](./screenshots/) — Executive Home, Discovery, CMDB, CMDB Drift, Digital Twin, Topology, Banking360, Security, ITSM, Reports, Guided Evaluation.

## Success criteria

| Criterion | Status |
|-----------|--------|
| Evaluator sees realistic data after load/login | Met (banner + populated modules) |
| Major modules show business value | Met |
| CMDB ≠ CMDB Drift | Met (distinct pages + copy) |
| No ISE on standard business pages | Mitigated via `friendlyError` + empty CTAs |
| 15-min guided demo | Met (`/demo/guided`) |
| Demo data clearly labeled | Met (`Illustrative Demo Data` banner) |

## Quality gate

A Gartner / Fortune 500 evaluator can walk a populated estate with clear illustrative labeling before connecting their environment.

## Known limitations

See [README.md](./README.md#known-limitations).
