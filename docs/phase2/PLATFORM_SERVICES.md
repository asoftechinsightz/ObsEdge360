# Phase 2 — Platform Services

Shared services future modules must consume (extend, do not duplicate):

| Service | Location | Phase 2 status |
|---------|----------|----------------|
| Plugin Framework | `packages/plugin-sdk` | Existing — reuse |
| Agent Framework | `packages/agent-framework` | Existing — reuse |
| Feature Flags | `feature_flags` + `/platform/feature-flags` | Added |
| Licensing | `platform_licenses` + `/admin/licenses` | Existing |
| Audit | dual-layer audit + governance audit | Existing |
| Notification Engine | integrations notification channels | Kill-switch added |
| Integration Hub | `/integrations` | Existing |
| Workflow Engine | `/automation` | Existing |
| Rules / alerts | `alert_rules` / AIOps | Synthetics feed alerts |
| AI Agents | `ai-agents` + copilot | Existing |

New product lines (SecureEdge360, CloudEdge360, …) should register feature flags and pack framework codes rather than forking these engines.
