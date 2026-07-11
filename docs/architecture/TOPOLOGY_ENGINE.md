# Topology Engine (Live Operational Graph)

Phase 3 Wave 4 elevates CMDB topology snapshots into a live multi-layer graph.

## Data flow

```
OTLP spans ──► syncTraceDependencies ──► inferred_dependencies + relationships(origin=trace)
Discovery   ──► kafka/CMDB ingest     ──► topology_events + snapshot refresh
UI          ◄── poll /topology/events + Cytoscape /topology page
```

## Layouts

`force-directed` | `layered` | `circular` | `grid` — positions persisted in `topology_layout_positions`.

## Blast radius

Postgres BFS with optional 5-minute cache (`blast_radius_cache`) and CI-type layer counts.
