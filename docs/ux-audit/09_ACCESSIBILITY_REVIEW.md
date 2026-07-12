# 09 — Accessibility Review

**Baseline:** Partial (`aria-busy` on LoadingSkeleton, `role="alert"` on ErrorState, `role="status"` on SuccessBanner). No evidence of systematic WCAG 2.2 AA program.

---

## Findings

| Area | Status | Risk |
|------|--------|------|
| Keyboard — palette | Ctrl/Cmd+K works | Good start |
| Keyboard — sidebar | Likely pointer-first | Tab order / landmarks unknown |
| Focus management | Modals/panels unclear | Copilot/palette need trap + restore |
| Color contrast | Dark slate + muted text | Verify slate-400 on slate-950 |
| Color-only status | Likely | Add icons/text for status |
| Charts | Recharts visuals | Need text summary |
| Cytoscape graphs | Canvas/WebGL-like interaction | Provide table alternate |
| Forms | Admin/IdP | Label association audit needed |
| Images / icons | Lucide | Ensure `aria-hidden` + text labels |
| Live regions | Notifications | Confirm polite announcements |
| Motion | Pulse skeletons | Honor `prefers-reduced-motion` |
| Skip link | Not found | Add “Skip to content” |
| Document titles | Per-route | Ensure unique `<title>` |
| Error text | Some filtered | Never expose stack traces |

---

## Recommendations

1. Accessibility pass on shell + Executive Home + Ops Intelligence + Security + Login (P0 journeys).  
2. Enforce `PageHeader` + labeled controls in design system.  
3. Every chart: visually hidden or visible summary sentence.  
4. Graph views: “List view” toggle using same data.  
5. Empty/Error states must be keyboard reachable with Retry.  
6. Debug JSON viewer: still keyboard accessible but not in main tab order of standard mode.  
7. Target **WCAG 2.2 AA** for GA customer-facing surfaces.

---

## Score

**Accessibility: 2.0 / 5** — foundations present; not enterprise-certified ready.
