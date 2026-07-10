# Documentation Hierarchy (Target)

**Status:** RECOMMENDED — adopt incrementally  
**Purpose:** Long-term navigation for engineers, partners, auditors, and enterprise customers  

---

## Target structure

```text
/docs
  /architecture          # C4, solution, security, AI, twin (existing + evolve)
  /adr                   # Architecture Decision Records
  /audit                 # Phase 0+ enterprise audits
  /ai                    # Copilot, agents, RAG, prompt registry
  /compliance            # Frameworks, evidence, country packs overview
  /country-packs         # IN, US, UK, EU, … pack specs
  /deployment            # VPS, compose, Helm (when ready), env
  /development           # Coding standards, local dev, DoD links
  /governance            # Frozen vision/roadmap, DoD, phase gates
  /operations            # Runbooks, backup, HA, incident
  /phase1 … /phaseN      # Plans, tests, release notes, lessons
  /plugins               # Plugin SDK, marketplace
  /prd                   # Product requirements (formal PRD)
  /trd                   # Technical requirements (formal TRD)
  /reviews               # PRR and other gated reviews
  /sdk                   # Client SDKs
  /security              # Threat models, pen-test, OWASP
  /solution-packs        # Banking360, Retail360, …
  /testing               # Strategy, matrices, evidence
  /ui                    # Design system, UX, studio specs
```

---

## Migration approach

1. **Do not mass-move** files mid-phase (breaks links).  
2. New documents go into the correct folder immediately.  
3. After each phase sign-off, optionally relocate legacy docs and leave stubs/redirects.  
4. Keep `docs/governance/`, `docs/adr/`, `docs/reviews/`, `docs/phaseN/` as authoritative for delivery gates.

## Already aligned

| Folder | Present |
|--------|---------|
| `/architecture` | Yes |
| `/adr` | Yes |
| `/audit` | Yes |
| `/governance` | Yes |
| `/phase1`, `/phase2` | Yes |
| `/reviews` | Yes (PRR) |
| `/sprint0` | Legacy sprint pack — retain until archived |

---

*Adopt fully as OpsEdge360 scales; enforce for all new docs from Phase 2 onward where practical.*
