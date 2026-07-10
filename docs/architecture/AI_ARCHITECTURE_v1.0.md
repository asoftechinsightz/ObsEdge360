# AI Architecture v1.0

**Document ID:** OE360-AI-ARCH-1.0  
**Version:** 1.0  
**Status:** FROZEN  
**Effective:** 2026-07-10  

---

## 1. Current state (honest)

- In-repo AI/agent surfaces are largely **rule-based / stub** maturity.  
- Not a production LLM Copilot platform yet.  
- Must not be marketed as autonomous AI until Phase 4 delivery.

## 2. Target architecture (Phases 4+)

```text
Operator → Web Copilot UI → API Gateway → AI orchestration
                                      ├─ LLM Gateway (ADR-022) → Providers
                                      ├─ RAG (ADR-023) → Tenant-scoped index
                                      └─ Approved read tools (CMDB, obs, docs)
Audit ← all prompts/actions (ADR-013)
Human approval ← high-risk remediation
```

## 3. Principles

1. Grounded answers (RAG + tools)  
2. Tenant isolation in retrieval and prompts  
3. No secret exfiltration to models  
4. Human-in-the-loop for destructive actions  
5. Single LLM egress via gateway  

## 4. ADRs

ADR-021 Copilot · ADR-022 LLM Gateway · ADR-023 RAG · related security ADRs.

## 5. Legacy

`14-AI-AGENT-ARCHITECTURE.md` is historical vision; **v1.0 wins** where it conflicts with stub reality.
