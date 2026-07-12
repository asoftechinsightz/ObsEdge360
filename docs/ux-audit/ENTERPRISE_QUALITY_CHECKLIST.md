# Enterprise Quality Checklist (page sign-off)

Use before merging any UX page change. Principles: [16_EIG_DESIGN_PRINCIPLES.md](./16_EIG_DESIGN_PRINCIPLES.md) · Measurement: [17_UX_PERFORMANCE_MEASUREMENT.md](./17_UX_PERFORMANCE_MEASUREMENT.md)

**Route / page:** _______________  
**PR / date:** _______________  
**Reviewer:** _______________

## Feel & look

- [ ] Feels fast (shell instant; data non-blocking)
- [ ] Looks premium (EIG: glass, 8–12px radius, 8px grid, typography)
- [ ] Motion 150–250ms, purposeful; respects reduced motion
- [ ] Fully responsive (laptop / tablet / ultrawide); no unwanted horizontal scroll
- [ ] Consistent with design system / shared primitives

## Trust & content

- [ ] No raw JSON in business view
- [ ] No tokens / SHA / gaClaim / developer metadata in standard UI
- [ ] Clear hierarchy: KPI · insights · actions · context · drill-down
- [ ] Empty / error / loading states (skeleton, not blank)
- [ ] No layout shift / loading flicker

## Accessibility

- [ ] Keyboard reach for primary actions
- [ ] Labels / contrast WCAG-minded
- [ ] Status not color-only

## Measurement

- [ ] LCP / INP / CLS checked or justified
- [ ] Bundle / heavy import noted if changed
- [ ] API call pattern sane (no obvious duplicate storms)

## Boardroom test

- [ ] Visually premium?
- [ ] Feels fast?
- [ ] Workflow obvious?
- [ ] CIO-safe in live demo?
- [ ] Reinforces trust?

**Sign-off:** ☐ Approved ☐ Return for refinement
