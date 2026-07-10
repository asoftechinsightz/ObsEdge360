# ADR-012: Compliance Rule Engine

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Product Owner, Compliance stakeholder  
**Phase:** 2 (foundation) · deeper packs later  
**Depends on:** ADR-009, ADR-013  

---

## Context

Compliance service exists in production compose, but a durable **rule engine** model (evaluate controls, evidence, pass/fail, frameworks) is not fully enterprise-grade. Country/solution packs will need pluggable rules without forking core.

## Decision

1. Define a **metadata-driven rule model**: framework → control → rule → evidence source → result.  
2. Core engine is **industry-agnostic**; Banking360/etc. contribute rule packs.  
3. Phase 2 delivers **foundation**: rule schema, evaluation API via gateway, audit of evaluation runs.  
4. Full framework coverage (ISO, SOC2, RBI, etc.) may span Phase 2–5; Phase 2 does not claim complete certification automation.  
5. Rules versioned; evaluations immutable once recorded.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Hardcode banking rules in core | Violates frozen pack policy |
| Delay all compliance work to Phase 5 | Blocks security narrative |
| External GRC-only (no in-product) | Weak product differentiator |

## Consequences

**Positive:** Pack-friendly compliance; auditor-friendly evidence path.  
**Negative:** Scope creep risk — must time-box Phase 2 to foundation.

## Compliance

- Risk: R-COMP-001.  
- No false “certified” marketing claims without evidence.  
