# 07 — AI Integration Summary

## Principle

AI assists **inside** workflows. Users are not forced to a separate AI page for common tasks.

## Surfaces

| Surface | Integration | Backend |
|---------|-------------|---------|
| Header Copilot panel | Full chat + RCA + recommendations | `/copilot/*` (existing) |
| Executive Home | Inline “AI executive brief” | `/copilot/chat` |
| Ops Intelligence | “Explain this incident” | `/copilot/chat` |
| Security Center | “Explain top security alert” | `/copilot/chat` |
| Reports | “Summarize latest reports” | `/copilot/chat` |
| AIOps page | Unchanged deep AI tools | `/ai/*` (existing) |

## Confidence

Inline responses surface approximate confidence and instruct users to verify before acting. RCA confidence from Ops Intelligence APIs is shown on TrustBar when present.

## Non-goals

- No new LLM services  
- No speculative autonomous remediation UI beyond existing approval flows  
- No auto-running AI on every page load (protects performance)
