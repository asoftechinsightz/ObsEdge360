# Product Roadmap — Releases (not engineering phases)

## Current status

**OpsEdge360 v1.0 Enterprise Platform — Engineering Freeze**

Allowed without Product Approval: critical bugs · security updates · performance improvements · customer-requested enhancements.  
Everything else requires Product Approval. See [`docs/ENGINEERING_FREEZE.md`](../ENGINEERING_FREEZE.md).

## Completed release line

```
v1.0.0 GA
  → RC1 Market Ready (P4_RC1_MARKET_VALIDATION_OK)
  → RC2 Pilot Ready (RC2_PILOT_VALIDATION_OK)
  → RC3 Enterprise Pilot (RC3_EPP_VALIDATION_OK)
  → Commercial Launch Preparation (this pack)
  → Engineering Freeze (v1.0)
```

## Forward roadmap

```
Enterprise Pilot Deployments (3–5 customers)
  → Customer Feedback
  → Version 1.1 (bug fixes + customer-driven improvements)
  → Version 2.0 (major capabilities informed by production usage)
```

## Explicit non-goals until proven production success

Do **not** start SecureEdge360, CloudEdge360, AgentEdge360, QuantumShield360, or broad new industry product families.

**Program TITAN** (`docs/titan/`) is the operating program for scale and customer success — not a feature wave.

**Roadmap rule:** no major feature without two independent pilot requests (or critical ops/security/compliance). See `docs/titan/09_ROADMAP_DISCIPLINE.md`.

**First secure:**

1. 3–5 enterprise pilot customers  
2. 2–3 production deployments  
3. Customer testimonials / case studies  
4. Reference architectures  
5. Proven operational success  

Those outcomes outweigh another six months of feature development without production users.

## v1.1 candidates (feedback-driven only)

- Operator Grafana starter boards  
- Helm coverage improvements requested by pilots  
- Supportability / diagnostics enhancements  
- Bug fixes from production  

## v2.0

Major capabilities **only** after production evidence — not speculative platform sprawl.

See also legacy notes in `docs/releases/ROADMAP.md` (superseded by this document for commercial planning).
