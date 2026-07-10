# ADR-028: Public SDK & Marketplace

**Decision Status:** Proposed  
**Date:** 2026-07-11  
**Deciders:** EAB (pending)  
**Phase / Release:** `v0.9.7` Marketplace & Plugin SDK  
**Depends on:** ADR-020, ADR-024, ADR-025  

---

## Business Context

A globally competitive platform needs a public SDK and marketplace for connectors, packs, and extensions while protecting core stability.

## Problem Statement

Without a governed SDK/marketplace model, partners may fork core or ship unsafe extensions.

## Decision (proposed)

1. Public SDK for APIs, plugins, and pack authors.  
2. Marketplace for distribution with signing, versioning, and permission manifests.  
3. **Permanent rule:** extensions are modules/plugins — never patch core.  
4. Security review + vuln process (ADR-018) for published items.  
5. Tenant install isolation.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Unrestricted npm in prod | Supply chain risk |
| Closed-only custom forks | Not scalable |

## Consequences

**Positive:** Ecosystem growth. **Negative:** Review burden; compatibility matrix.

## Security Impact

Unsigned plugins forbidden; least-privilege permissions.

## Performance Impact

Sandbox overhead TBD.

## Scalability Impact

CDN for artifacts; multi-tenant catalog.

## Compliance Impact

Partner due diligence process required.

## Rollback Strategy

Unpublish / disable installs; core unaffected.

## Future Considerations

Revenue share, private enterprise catalogs.

## Decision Status

**Proposed** — before `v0.9.7`.  
