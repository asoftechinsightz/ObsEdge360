# Demo Data Quality Review

**Tenant:** Asoftech Global Bank (Demo) · `asoftech-global-bank-demo`  
**Entry:** `POST /demo/ede/enter` or CIO login

## Coverage when pack loaded

| Domain | Demo content | Dashboard visibility |
|--------|--------------|-------------------|
| Business services | 5+ tier-1 banking services | Table widget, domain.services |
| KPIs | Availability, revenue-at-risk, compliance, MTTR | 8 health widgets |
| Risks | Drift-backed + fallback risks | Top risks panel |
| AI recommendations | 4 proactive items | Intelligence panel |
| Incidents | Derived from `activeIncidents` | Recent incidents |
| Domains | CMDB inventory by type | 9 domain cards |
| Trends | 30-day `ede_executive_daily` | Charts |
| Narrative | Rule-based executive brief | TrustBar + narrative |

## Strengths

- Banking-vertical story (UPI, CBS, payments) resonates with CIO demos  
- Revenue-at-risk in ₹ aligns with India enterprise buyers  
- Drift events tie to CMDB Drift CTA  
- Illustrative label visible in TrustBar  
- `DemoDataBanner` prompts load when pack missing

## Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No multi-region labels on dashboard | Medium | Add region facet in Wave 3 tenant config |
| Incident titles generic ("Active incident #N") | Medium | Seed named incidents in EDE |
| No "Recent changes" / "Upcoming maintenance" widgets | Low | Backend widgets Wave 4 |
| Root cause not explicit section | Low | Extend narrative or RCA widget |
| Empty tenant without pack | High | Banner + login CTA — **mitigated** |

## Demo never empty checklist

- [x] Demo enter API provisions tenant  
- [x] Guided eval CTA on empty dashboard  
- [x] Fallback risks/recommendations in aggregator  
- [x] TrustBar shows data source label  
- [ ] Screenshot proof after prod deploy Wave 1+2

## Score: **8.5 / 10** for demo vitality on Executive Dashboard
