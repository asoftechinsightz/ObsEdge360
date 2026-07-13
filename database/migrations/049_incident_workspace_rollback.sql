-- 049_incident_workspace_rollback.sql
-- Rollback for 049_incident_workspace.sql (RC1)

DROP TABLE IF EXISTS ops_incident_watchers;
DROP TABLE IF EXISTS ops_incident_comments;
DROP TABLE IF EXISTS ops_incident_activity;

ALTER TABLE ops_incidents
  DROP COLUMN IF EXISTS owner_id,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS acknowledged_at,
  DROP COLUMN IF EXISTS investigating_at,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS closed_at,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS assigned_at,
  DROP COLUMN IF EXISTS business_impact,
  DROP COLUMN IF EXISTS workspace_state,
  DROP COLUMN IF EXISTS closure_report_id,
  DROP COLUMN IF EXISTS sla_due_at;

-- status column widened to VARCHAR(40); leave widened (safe) unless restoring from backup
