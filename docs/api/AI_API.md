# AI / LLM API (Phase 4 Wave 1)

Base: `/api/v1/ai`

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/chat` |
| POST | `/rag/documents` |
| GET | `/rag/documents` |
| GET | `/rag/retrieve?q=` |
| POST | `/rca` |
| GET | `/rca` |
| GET | `/rca/:id` |
| POST | `/copilot` |
| POST | `/correlate` |
| GET | `/correlations` |

Env: `LLM_API_KEY` or `OPENAI_API_KEY`, optional `LLM_BASE_URL`, `LLM_MODEL`.
