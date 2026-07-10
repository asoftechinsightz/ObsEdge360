# ADR-025: Country Compliance Pack Framework

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Security/Compliance, Chief Architect  
**Phase:** 5 (primary); rules consume ADR-012 engine  
**Depends on:** ADR-012, ADR-024  

---

## Context

Regulatory controls vary by country/region (IN, US, UK, EU, …). Hardcoding country law into core or into a single industry pack does not scale.

## Decision

1. **Country Compliance Pack** = versioned rule/evidence/content pack for a jurisdiction.  
2. Evaluated by the compliance rule engine (ADR-012); industry packs may **compose** with country packs.  
3. Core remains jurisdiction-agnostic.  
4. Packs declare applicability (countries, frameworks) and version compatibility with engine.  
5. Evidence templates and control mappings ship in the pack, not in core services.  
6. No country pack required to run the platform.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| One global control set | Non-compliant locally |
| Country forks of the monorepo | Unmaintainable |
| Industry pack owns all country law | Couples vertical to geography wrongly |

## Consequences

**Positive:** Expand country coverage without core rewrites.  
**Negative:** Pack compatibility matrix; legal review process needed.

## Compliance

- Claims of regulatory coverage must match installed pack versions.  
- Documentation hierarchy: `docs/country-packs/`.  
