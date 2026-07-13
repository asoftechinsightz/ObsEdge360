# RC3 Performance Report — Twin BSI

**Date:** 2026-07-13  
**Production SHA:** `f5c706c72fd3601a043d528b544c31c976a133f1`  
**Method:** Python `time.perf_counter`, n=7 samples, median (p50)  
**Raw:** `docs/releases/rc3-evidence/perf.txt`

## Verdict: **PASS**

| Probe | p50 | Target | Result |
|-------|-----|--------|--------|
| Twin enterprise graph | 32.2 ms | &lt; 2000 ms | **PASS** |
| Business services list | 26.8 ms | &lt; 2000 ms | **PASS** |
| Business service detail | 10.6 ms | &lt; 2000 ms | **PASS** |
| Service-focused graph | 13.4 ms | &lt; 2000 ms | **PASS** |
| Blast radius | 42.6 ms | &lt; 500 ms | **PASS** |
| Twin AI explain | 40.7 ms | &lt; 2000 ms | **PASS** |
| Executive risk | 26.1 ms | &lt; 2000 ms | **PASS** |
| Executive dashboard | 10.4 ms | &lt; 2000 ms | **PASS** |

## Sprint 3 target mapping

| Requirement | Measured | Status |
|-------------|----------|--------|
| Graph load &lt; 2 s | 32.2 ms p50 | **PASS** |
| Impact / blast &lt; 500 ms | 42.6 ms p50 | **PASS** |
| Business Service page &lt; 2 s | 10.6 ms API p50 | **PASS** |
| Executive Dashboard refresh | 10.4 ms p50 | **PASS** |

Relationship lookups are included in enterprise/service graph queries (edges returned with nodes).

## Notes

- Timing excludes browser paint; UI screenshots confirm interactive Twin loads under auth.  
- Health propagation probe is functional (CI update → BS rollup), not a latency SLA gate.
