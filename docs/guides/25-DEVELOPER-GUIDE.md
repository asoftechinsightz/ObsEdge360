# OpsEdge360 — Developer Guide

## Local Development

```bash
git clone <repo>
cd OpsEdge360
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

Services:
- Web: http://localhost:3000
- API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

## Repository Layout

| Path | Description |
|------|-------------|
| `apps/web` | Next.js frontend |
| `apps/api-gateway` | NestJS gateway |
| `services/*` | Domain microservices |
| `ai-agents` | Python LangGraph agents |
| `packages/shared-types` | Shared TypeScript types |
| `openapi/` | API specifications |

## Adding a Discovery Connector

1. Implement `DiscoveryConnector` interface in `services/discovery/src/connectors/`
2. Register in `connectors.registry.ts`
3. Add OpenAPI schema for connector config
4. Write unit tests with mock target

```typescript
export class MyConnector implements DiscoveryConnector {
  name = 'my-protocol';
  async *discover(config: ConnectorConfig) {
    yield { name: 'asset-1', ci_type: 'server', attributes: {} };
  }
}
```

## Adding a Compliance Control

1. Insert control in `compliance_controls` seed or migration
2. Define `validation_query` JSON
3. Compliance service auto-picks up on next schedule

## API Development

- Follow OpenAPI spec in `openapi/trinetra360-v1.yaml`
- Version breaking changes under `/api/v2/`
- Include `tenant_id` from JWT in all queries

## Event Publishing

```typescript
await kafka.publish('asset.discovered', {
  tenant_id,
  payload: { name, ci_type, attributes },
});
```

## AI Agent Development

```bash
cd ai-agents
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn src.main:app --reload --port 5000
```

Add agent in `src/agents/` and register in `src/orchestrator.py`.

## Testing

```bash
npm test                    # all workspaces
npm test -w @opsedge360/cmdb
cd ai-agents && pytest
```

## Code Style

- TypeScript: ESLint + Prettier
- Python: ruff + black
- Conventional commits: `feat(cmdb): add relationship API`

## Pull Request Checklist

- [ ] Unit tests added
- [ ] OpenAPI updated if API changed
- [ ] Migration added if schema changed
- [ ] No secrets in code
