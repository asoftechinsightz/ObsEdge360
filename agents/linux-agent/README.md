# Linux Agent

Enterprise OpsEdge360 agent for Linux hosts with journald integration readiness.

## Capabilities

- Agent registration and heartbeat
- Host metrics (CPU, memory, disk, load)
- Configuration pull/push
- Offline queue and compression
- Mutual TLS ready

## Run

```bash
cp agent.env.example agent.env
npm run agent:linux
```
