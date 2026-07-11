# Phase 4 Wave 1 — Deployment

1. Apply migration **028**.
2. Optional: set `LLM_API_KEY` / `OPENAI_API_KEY` (+ `LLM_BASE_URL`, `LLM_MODEL`) for live LLM; otherwise evidence-synthesis-v1 fallback is used.
3. Rebuild observability, api-gateway, web.
4. Run `scripts/vps-p4-wave1-validate.sh` → `P4_WAVE1_VALIDATION_OK`.
