# Sprint 3 — UI Guide

## Primary surface

**Route:** `/twin`  
**Nav:** Estate → Digital Twin

## Layout

1. **Executive risk strip** — business health, revenue at risk, incidents, top twin risks  
2. **Business services list** (left) — tier, capability, owner, health score  
3. **Enterprise graph** (center) — violet business-service nodes + CI mesh  
4. **Inspector** (right) — tabs: Overview · Blast · AI · History  

## Journey

1. Open Digital Twin  
2. Select **UPI Payments** (or any tier-1 service)  
3. Review ownership, SLA, KPIs  
4. Click **Blast radius** — see revenue impact, recovery order, highlighted graph  
5. Open **Twin AI** — evidence grounded in twin relationships  
6. Open **History** — health snapshots (time-travel MVP)  
7. Jump to Observability / Incidents / Drift / Executive Home  

## Deep links

- `/twin?serviceId=<uuid>&workflow=impact`  
- `/twin?workflow=impact&name=UPI`  

## Integration

- Executive Home services/risks prefer Twin BSI data  
- Observability entities continue to link into Twin impact workflows  
