# Audit Event Schema (Standard) v1.1

**Document ID:** OE360-AUDIT-SCHEMA-001  
**Status:** ✅ **v1.1 ACCEPTED** (with SDS-2.3)  
**Storage:** L1 `audit_logs` · Queue `audit_evidence_outbox` · L2 `audit_evidence`  

## schemaVersion

All events MUST set `schemaVersion: "1.1"`.

## Mandatory fields

eventId, tenantId, organizationId, timestamp, eventCategory, eventType, actor, actorType, resourceType, resourceId, action, outcome, severity, sourceService, environment, correlationId, traceId, sessionId, clientIp, userAgent, beforeHash, afterHash, metadata, signature, schemaVersion  

See [SDS-2.3](./sds/SDS-2.3-AuditFramework.md) §5 for normative definitions. Optional fields may be null but keys should be present in canonical hash payload.

## Pipeline

Request path → L1 sync → durable outbox enqueue → Evidence Writer → L2 (never sync L2 on request path).
