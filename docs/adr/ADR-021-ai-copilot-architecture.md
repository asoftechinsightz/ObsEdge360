# ADR-021: AI Copilot Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Chief Architect, Security Architect  
**Phase:** 4  
**Depends on:** ADR-009, ADR-013, ADR-022, ADR-023  

---

## Context

Current “AI agents” are largely rule-based stubs. Enterprise Copilot must be grounded, auditable, and safe — not free-form hallucination over production systems.

## Decision

1. **AI Copilot** assists operators with explanations, RCA hypotheses, and guided actions.  
2. Copilot **must not** execute high-risk remediation without human approval.  
3. Answers grounded via RAG (ADR-023) + tool calls to approved read APIs.  
4. All Copilot sessions auditable (ADR-013); prompts/responses retained per policy.  
5. Tenant isolation enforced; no cross-tenant context in prompts.  
6. Provider access only through LLM Gateway (ADR-022).  
7. No Phase 4 production code until ADR Accepted + Phase 4 plan approved.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Direct browser→LLM | Secret/key leakage; no audit |
| Fully autonomous remediation | Unacceptable operational risk |
| Keep stubs indefinitely | Product credibility risk |

## Consequences

**Positive:** Safe enterprise AI narrative.  
**Negative:** Higher build cost; latency/cost of LLM calls.

## Compliance

- Risks R-AI-001…003 · honest UI labeling until live.  
