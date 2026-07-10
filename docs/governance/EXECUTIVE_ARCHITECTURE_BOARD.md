# Executive Architecture Board (EAB)

**Document ID:** OE360-EAB-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Authority:** Product Owner · Chief Architect · Security Architect · DevOps/SRE Lead  

---

## 1. Purpose

The Executive Architecture Board governs architecture decisions, technology choices, risk acceptance, and exceptions so OpsEdge360 remains modular, secure, and enterprise-deployable.

---

## 2. Membership

| Role | Responsibility |
|------|----------------|
| Product Owner | Scope, priority, business risk acceptance |
| Chief Architect | Architecture coherence, ADR quality, tech fit |
| Security Architect | Threat model, security ADRs, residual risk |
| DevOps / SRE Lead | Operability, deployability, rollback, capacity |
| Engineering Lead (optional) | Implementation feasibility |
| Executive sponsor (as needed) | Critical risk / production lock exceptions |

Quorum for binding decisions: **Chief Architect + Security Architect + Product Owner** (minimum three).

---

## 3. Architecture review process

### When required

- Start of every phase (before implementation)  
- Any change that alters service boundaries, data ownership, authn/authz, tenancy, or production locks  
- Introduction of a new runtime dependency, datastore, or message bus  

### Process

1. Author submits architecture brief or ADR draft  
2. EAB reviews against frozen vision, roadmap, and production locks  
3. Outcome: **Approve** · **Approve with conditions** · **Reject** · **Defer**  
4. Decision recorded in ADR status + meeting notes (or PR comment trail)  

### Inputs

- Phase plan / WBS  
- Relevant ADRs  
- Risk Register entries  
- Impact on `trinetra360`, domains, Nginx/SSL, volumes, migrations 001–014  

---

## 4. ADR approval process

| Stage | Status | Meaning |
|-------|--------|---------|
| Draft | Proposed | Authoring; not binding |
| EAB review | Under Review | Quorum reviewing |
| Accepted | Accepted | Binding; implementation may proceed for that scope |
| Rejected | Rejected | Do not implement |
| Superseded | Superseded | Replaced by later ADR |
| Deferred | Deferred | Parked with owner + revisit phase |

**Rules:**

1. No production code for a capability until its ADR is **Accepted**.  
2. From ADR-009 onward, ADRs MUST include all mandatory sections in `docs/adr/ADR_TEMPLATE.md`.  
3. Phase ADRs may be drafted while the prior phase is conditionally approved, but **acceptance** requires EAB quorum.  
4. Index maintained in `docs/adr/README.md`.  
5. Decision Status values: Proposed · Accepted · Superseded · Deprecated.  

---

## 5. Technology approval

New languages, frameworks, datastores, brokers, cloud services, or SaaS integrations require EAB approval.

| Criterion | Question |
|-----------|----------|
| Fit | Does it serve frozen architecture without fragmenting the stack? |
| Ops | Can SRE run, backup, monitor, and patch it? |
| Security | Secrets, auth, CVE posture, data residency |
| Cost / lock-in | License and exit path acceptable? |
| Alternatives | Was an existing approved tech considered? |

**Default stack (approved):** TypeScript/Node (NestJS), Next.js, PostgreSQL (`trinetra360`), Redis, Kafka (as deployed), Docker Compose (current prod), Nginx + TLS at edge.

Deviations require a written ADR.

---

## 6. Risk acceptance

1. Risks logged in `RISK_REGISTER.md` with severity, owner, mitigation, residual risk.  
2. **High** residual risk: Security Architect + Product Owner acceptance.  
3. **Critical** residual risk: full EAB quorum + executive sponsor.  
4. Accepted risks must appear in the phase PRR conditions tracker if they affect release.  

---

## 7. Exception process

Use for temporary deviation from DoR, DoD, coding standards, production locks, or accepted ADRs.

| Field | Required |
|-------|----------|
| Exception ID | `EXC-YYYY-NNN` |
| Requestor | Name / role |
| Rule being waived | Link to doc section |
| Justification | Why needed now |
| Scope & duration | What / until when |
| Residual risk | From Risk Register |
| Compensating controls | What reduces risk |
| Approvers | Per severity below |
| Close criteria | How exception ends |

**Approval by severity**

| Severity | Approvers |
|----------|-----------|
| Low | Chief Architect |
| Medium | Chief Architect + Security Architect |
| High | EAB quorum |
| Critical / production lock | EAB quorum + executive sponsor |

Exceptions are time-boxed. Expired exceptions are either closed or re-approved.

---

## 8. Cadence

| Event | Cadence |
|-------|---------|
| Phase kickoff architecture review | Once per phase |
| ADR batch review | As needed; before coding gate |
| Risk / debt review | At least once per phase exit |
| Exception review | Monthly or at PRR |

---

## 9. Related documents

- `DEFINITION_OF_READY.md` · `DEFINITION_OF_DONE.md` · `PHASE_GATE_MODEL.md`  
- `RISK_REGISTER.md` · `TECHNICAL_DEBT_REGISTER.md` · `RELEASE_CHECKLIST.md`  
- `docs/adr/` · `docs/reviews/`  
