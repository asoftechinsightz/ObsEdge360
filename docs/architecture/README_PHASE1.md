# OpsEdge360 Architecture — Phase 1 Index

**Status:** Enterprise blueprint complete (design-only; no large-scale implementation in this phase)  
**Date:** 2026-07-13  
**SSOT entry:** [OPSEDGE360_ENTERPRISE_ARCHITECTURE.md](./OPSEDGE360_ENTERPRISE_ARCHITECTURE.md)

---

## Phase 1 deliverables

| # | Document | Path |
|---|----------|------|
| 1 | Enterprise Solution Architecture | [OPSEDGE360_ENTERPRISE_ARCHITECTURE.md](./OPSEDGE360_ENTERPRISE_ARCHITECTURE.md) |
| 2 | Product Module Architecture | [OPSEDGE360_PRODUCT_MODULES.md](./OPSEDGE360_PRODUCT_MODULES.md) |
| 3 | Screen Architecture | [OPSEDGE360_SCREEN_ARCHITECTURE.md](./OPSEDGE360_SCREEN_ARCHITECTURE.md) |
| 4 | Information Architecture | [OPSEDGE360_INFORMATION_ARCHITECTURE.md](./OPSEDGE360_INFORMATION_ARCHITECTURE.md) |
| 5 | UX Design Principles | [OPSEDGE360_UX_DESIGN_PRINCIPLES.md](./OPSEDGE360_UX_DESIGN_PRINCIPLES.md) |
| 6 | Digital Twin (flagship) | [OPSEDGE360_DIGITAL_TWIN_ARCHITECTURE.md](./OPSEDGE360_DIGITAL_TWIN_ARCHITECTURE.md) |
| 7 | AI Architecture | [OPSEDGE360_AI_ARCHITECTURE.md](./OPSEDGE360_AI_ARCHITECTURE.md) |
| 8 | Integration Architecture | [OPSEDGE360_INTEGRATION_ARCHITECTURE.md](./OPSEDGE360_INTEGRATION_ARCHITECTURE.md) |
| 9 | Plugin Framework | [OPSEDGE360_PLUGIN_FRAMEWORK.md](./OPSEDGE360_PLUGIN_FRAMEWORK.md) |
| 10 | Enterprise APIs | [OPSEDGE360_ENTERPRISE_APIS.md](./OPSEDGE360_ENTERPRISE_APIS.md) |
| 11 | Event Architecture | [OPSEDGE360_EVENT_ARCHITECTURE.md](./OPSEDGE360_EVENT_ARCHITECTURE.md) |
| 12 | Enterprise Data Model | [OPSEDGE360_ENTERPRISE_DATA_MODEL.md](./OPSEDGE360_ENTERPRISE_DATA_MODEL.md) |
| 13 | Product Branding | [OPSEDGE360_PRODUCT_BRANDING.md](./OPSEDGE360_PRODUCT_BRANDING.md) |

---

## Related inputs

| Source | Path |
|--------|------|
| Frozen product vision | `docs/governance/FROZEN_PRODUCT_VISION.md` |
| Phase 0 foundation recommendation | `workspace/research/comparison/OPSEDGE360_FOUNDATION_RECOMMENDATION.md` |
| Phase 0 research workspace | `workspace/research/` |

---

## Standing rules

- **Do not** fork / rebrand / rewrite SkyWalking, Wazuh, GLPI, NetBox, n8n, Ansible  
- **Do** integrate via adapters under a single OpsEdge360 experience  
- Large-scale feature implementation waits on architecture acceptance  

---

## Next (after approval)

1. ADRs for adapter interface v1 freeze  
2. OpenAPI stubs for canonical Observe/Security/Twin contracts  
3. Thin vertical spikes (read-only adapters) — still no engine forks  
