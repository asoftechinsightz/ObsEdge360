# Compatibility Matrix — RC3

## Versions

| Component | Compatible |
|-----------|------------|
| RC2 APIs | Yes (additive) |
| RC1 market APIs | Yes |
| DB migrations | Forward 045–047 |
| Agents | Existing GA agents |

## Environments

| Environment | Support |
|-------------|---------|
| Ubuntu 22.04 + Compose | Primary pilot |
| Compose HA | Supported |
| Helm gateway/web | Supported (partial mesh) |
| Air-gap | Supported via scripts |
| Full K8s microservices | Compose parity gap (known) |
