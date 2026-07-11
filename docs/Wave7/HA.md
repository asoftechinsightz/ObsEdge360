# Wave 7 — HA

`scripts/wave7-chaos-ha.sh` force-recreates api-gateway / discovery and restarts PostgreSQL, waiting for `/health` recovery. HA suite attestations record recovery without claiming multi-AZ unless `HA_MULTI_NODE=true`.
