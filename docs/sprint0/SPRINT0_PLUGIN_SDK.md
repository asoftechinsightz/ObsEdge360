# Sprint 0 Plugin SDK

## Package

`@opsedge360/plugin-sdk`

## Supported Runtimes

| Runtime | Entrypoint Convention |
|---------|----------------------|
| Node | `index.js` |
| Python | `main.py` |
| Java | `PluginMain.class` |
| Go | `plugin.so` |
| .NET | `Plugin.dll` |
| Rust | `libplugin.so` |

## Plugin Lifecycle

1. **Register** — Validate manifest + checksum
2. **Activate** — Load in sandbox
3. **Execute** — Run with PluginContext
4. **Disable** — Remove from registry
5. **Version** — Semver with unique `id@version` key

## Security Sandbox

Levels: `none`, `process`, `wasm`, `container`

Default allowed: `process`, `wasm`

## Marketplace Ready

Manifest field `marketplaceReady: true` indicates publication eligibility.

## Manifest Example

```json
{
  "id": "acme.metrics.collector",
  "name": "ACME Metrics",
  "version": "1.0.0",
  "runtime": "node",
  "entrypoint": "index.js",
  "capabilities": ["metrics", "discovery"],
  "permissions": ["observability:write"],
  "sandbox": "process",
  "checksumSha256": "...",
  "marketplaceReady": true
}
```

## Database Registry

`plugin_registry` table stores tenant-scoped plugin manifests.

## Agent Integration

`PluginHost` in `@opsedge360/agent-framework` manages edge plugins with capability and sandbox enforcement.
