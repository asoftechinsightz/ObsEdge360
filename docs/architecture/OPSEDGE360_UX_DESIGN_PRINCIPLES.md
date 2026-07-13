# OpsEdge360 — UX Design Principles

**Document ID:** OE360-UX-P1-001  
**Phase:** 1  
**Inspiration:** Enterprise platforms (Dynatrace, Datadog, ServiceNow, Splunk class) — **patterns only, never copy**.

---

## 1. Experience north star

OpsEdge360 must feel like software used by **Fortune 500** operators and executives:

- Modern · Luxury · Clean · Executive · Fast · Minimal  
- Dark **and** light themes  
- Accessible (WCAG 2.2 AA target)  
- Responsive  
- Glassmorphism **only where it clarifies hierarchy** (not decoration noise)

---

## 2. Brand in the UI

- Product name **OpsEdge360** is a hero-level signal on branded surfaces  
- Footer / about: **Powered by AsoftechInsightz**  
- **Zero** third-party product names, logos, or default themes from engines in customer UI  

See [OPSEDGE360_PRODUCT_BRANDING.md](./OPSEDGE360_PRODUCT_BRANDING.md).

---

## 3. Composition rules

| Rule | Detail |
|------|--------|
| One job per view | Avoid dashboard soup on first viewport unless the screen *is* the command center |
| Hierarchy | Brand → primary KPI/question → one supporting sentence → primary actions → evidence |
| Cards sparingly | Prefer layout rhythm; cards only when they bound interaction |
| Density modes | Executive (sparse) vs Operator (dense tables) — explicit toggle |
| Motion | 2–3 intentional motions max per journey (presence, not noise) |

Align with existing frontend design rules in the product team playbook.

---

## 4. Visual system

| Token | Guidance |
|-------|----------|
| Typography | Expressive, purposeful; avoid generic Inter/Roboto/Arial defaults for marketing/exec surfaces; product UI may use design-system fonts |
| Color | Clear semantic statuses (healthy/warn/critical/unknown); avoid “AI purple default” cliché as identity |
| Surfaces | Subtle depth, optional glass on overlays; not flat gray slabs only |
| Icons | Consistent set; no emoji as UI |
| Charts | Same palette; accessible contrast |

---

## 5. Interaction principles

1. **Speed** — skeleton loaders; optimistic UI only when safe  
2. **Trust** — show data freshness (“as of …”, source = OpsEdge domain, not engine name)  
3. **Safety** — destructive/automation actions require confirm + reason  
4. **Continuity** — every alert/finding ends in a workspace, not a dead end  
5. **Search-first** — power users never depend on deep menu hunting  
6. **Copilot assist** — suggest next best action; never silently change production  

---

## 6. Theme & accessibility

| Mode | Use |
|------|-----|
| Dark | NOC / SecOps default |
| Light | Executive daytime / print-friendly reports |
| High contrast | Accessibility preference |

Requirements: keyboard nav, focus rings, screen-reader labels, reduced-motion support.

---

## 7. Anti-patterns (forbidden)

- Embedding upstream UIs in iframes as the product  
- Showing “Powered by SkyWalking/Wazuh/…” in customer chrome  
- Dead `href="#"` actions  
- Alert lists without investigate path  
- Empty twin graphs in demo/enterprise packs  

---

## 8. Quality bar

A screen ships only when:

- Purpose is clear in &lt; 5 seconds  
- Primary action is obvious  
- Empty/error/loading states are designed  
- RBAC hides unauthorized actions  
- Deep links work from search, Copilot, and notifications  
