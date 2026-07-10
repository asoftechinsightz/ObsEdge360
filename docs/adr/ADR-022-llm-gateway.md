# ADR-022: LLM Gateway

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Chief Architect, Security Architect, SRE Lead  
**Phase:** 4  
**Depends on:** ADR-014, ADR-021  

---

## Context

Multiple LLM providers and models will be needed. Direct coupling from services to vendor SDKs creates secret sprawl, inconsistent safety controls, and poor cost observability.

## Decision

1. Introduce an **LLM Gateway** (service or module) as the only outbound path to model providers.  
2. Responsibilities: auth to providers, model routing, rate limits, timeouts, redaction, usage metering, circuit breaking.  
3. API for internal callers: chat/complete/embed with tenant + purpose tags.  
4. Provider keys only via secrets management (ADR-014).  
5. Support pluggable providers (OpenAI-compatible, Azure, local) behind one interface.  
6. No production LLM calls bypassing the gateway.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Per-service vendor SDK | Inconsistent security/cost control |
| Browser-side keys | Unacceptable |
| Single hard-coded vendor | Lock-in |

## Consequences

**Positive:** Central governance for AI spend and safety.  
**Negative:** Extra hop; gateway HA becomes critical for AI features.

## Compliance

- Logging must not store raw secrets; PII minimization policy required.  
