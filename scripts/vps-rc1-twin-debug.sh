#!/bin/bash
set -euo pipefail
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "
SELECT COUNT(*) AS rels FROM relationships r
JOIN configuration_items s ON s.id=r.source_ci_id
JOIN configuration_items t ON t.id=r.target_ci_id;
"
docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -c "
SELECT s.name AS src, t.name AS dst, r.relationship_type
FROM relationships r
JOIN configuration_items s ON s.id=r.source_ci_id
JOIN configuration_items t ON t.id=r.target_ci_id
LIMIT 10;
"
