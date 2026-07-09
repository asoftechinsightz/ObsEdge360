# Host agent — metrics + heartbeat

See **[agents/host-agent/README.md](../agents/host-agent/README.md)** for install and operations.

## Summary

| Item | Detail |
|------|--------|
| Package | `agents/host-agent` |
| Command | `node bin/opsedge360-agent.js` |
| Auth | `X-Agent-Key` (no JWT) |
| Interval | Default 30s |
| Metrics | Real CPU, memory, disk, load, network (Linux) |
| Console | Discovery → Agents (online) · Observability → Hosts (metrics) |

## Quick start

1. Register agent in UI (`/discovery` → Agents)  
2. Copy `agent.env` values from the registration banner  
3. On target: `node bin/opsedge360-agent.js --once` then run as a service  
