# Phase 5 Wave 3 — Validation

**Script:** `scripts/vps-p5-wave3-validate.sh`  
**Token:** `P5_WAVE3_VALIDATION_OK`  
**Production result (2026-07-11):** **pass=22 fail=0** at tip `9e1eade5`

Checks covered: health, migration 035 tables, signup, weak password rejection, platform / platform-health scores, quota upsert+evaluate, capacity/storage shapes, security policies, settings, licenses (non-disruptive), governance audit events, sessions, unauth 401.

Does **not** claim `P5_GA_VALIDATION_OK` or tag `v1.0.0`.
