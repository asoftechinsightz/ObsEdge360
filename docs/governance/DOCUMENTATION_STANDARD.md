# Documentation Standard

**Document ID:** OE360-DOC-STD-001  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

Companion to `DOCUMENTATION_HIERARCHY.md` and legacy stub `DOCUMENTATION_STANDARDS.md`.

---

## 1. Principles

1. **Docs are delivery artifacts** — DoD requires documentation updates with behavior changes.  
2. **Single source of truth** — Prefer one authoritative doc; link rather than copy.  
3. **Version frozen baselines** — Architecture v1.0 is immutable; evolve via ADR + new version files.  
4. **Honest maturity** — Do not document unimplemented routes/services as production.  
5. **Audience clarity** — State whether a doc is for engineers, operators, auditors, or executives.

---

## 2. Required metadata (new docs)

```markdown
# Title

**Document ID:** OE360-...
**Version:** x.y
**Status:** DRAFT | PROPOSED | ACCEPTED | FROZEN | SUPERSEDED | LIVING
**Effective:** YYYY-MM-DD
**Related:** links…
```

ADRs use: Context → Decision → Alternatives → Consequences → Compliance → Status.

---

## 3. Folder rules

| Path | Content |
|------|---------|
| `docs/governance/` | Policies, DoR/DoD, baselines, registers |
| `docs/adr/` | Architecture Decision Records |
| `docs/architecture/` | Versioned HLD/LLD/baselines + legacy numbered docs |
| `docs/phaseN/` | Plans, tests, release notes, lessons |
| `docs/reviews/` | PRR and gated reviews |
| `docs/audit/` | Enterprise audits |
| `docs/deployment/` / ops | Prefer hierarchy target; legacy deploy docs OK until migrated |

New docs go to the correct folder immediately. Mass moves only after phase sign-off with stubs left behind.

---

## 4. When documentation must be updated

| Change | Update |
|--------|--------|
| New/changed HTTP API | OpenAPI + API notes |
| New migration | Migration list / data architecture note |
| Compose/prod topology | Deployment architecture + runbooks |
| Security control | Security baseline / ADR |
| Phase exit | Release notes + lessons + PRR |
| Accepted ADR | `docs/adr/README.md` status |

---

## 5. Freeze & versioning

- `*_v1.0.md` architecture baselines are **FROZEN**.  
- Do not edit frozen files except typo/errata with change log note.  
- Material changes → ADR + `*_v1.1.md` (or v2.0) that supersedes prior.  
- Governance LIVING docs (risk/debt registers) may update in place with `Last updated`.

---

## 6. Quality bar

- Links resolve or are marked TBD  
- Production claims match gateway + compose  
- Secrets never pasted into docs  
- Diagrams use mermaid or linked images  

## Related

- `DEFINITION_OF_DONE.md` · `DOCUMENTATION_HIERARCHY.md` · `EXECUTIVE_ARCHITECTURE_BOARD.md`  
