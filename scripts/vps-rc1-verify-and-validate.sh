#!/bin/bash
set -euo pipefail
echo "=== verify 049 ==="
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT column_name FROM information_schema.columns WHERE table_name='ops_incidents' AND column_name IN ('owner_id','priority','business_impact','workspace_state','closure_report_id') ORDER BY 1;"
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT COUNT(*) AS activity FROM ops_incident_activity;"
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT COUNT(*) AS cis FROM configuration_items;"
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "SELECT COUNT(*) AS rels FROM relationships;"
bash /tmp/vps-rc1-validate.sh
