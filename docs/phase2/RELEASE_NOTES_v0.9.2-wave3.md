# Release Notes — v0.9.2-wave3

**Release:** `v0.9.2-wave3` (proposed tag pending EAB Wave 3 closure)  
**Date:** 2026-07-11  
**Production SHA:** `3ee904c`  

## Summary

Wave 3 Audit & Compliance Foundation is deployed and production-validated: dual-layer audit with durable outbox queue, evidence writer, integrity verification, retention/legal-hold APIs, and schema v1.1.

## Highlights

- Async path: App → outbox → Evidence Writer → `audit_evidence`  
- No sync L2 on request path  
- Search / export / verify / retention / legal hold / health APIs  
- Migration 017  

## Validation

`WAVE3_VALIDATION_OK` — 17 pass / 0 fail  

## References

- `docs/phase2/WAVE3_DEPLOYED.md`  
- `docs/phase2/sds/SDS-2.3-AuditFramework.md`  
