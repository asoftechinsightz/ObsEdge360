# Wave 7 — High Availability

See also [HA.md](./HA.md).

`scripts/wave7-chaos-ha.sh` validates recovery from API gateway recreate, discovery worker recreate, PostgreSQL restart (with pool recovery), and Redis restart. Recovery times are recorded in `chaos_experiments` and HA certification runs.
