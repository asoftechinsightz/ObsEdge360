# Wave 7 — Chaos Engineering

See also [Chaos.md](./Chaos.md).

Controlled fault injection: container force-recreate, datastore restart, redis restart, burst-probe recovery. Experiments are audited via governance events and stored in `chaos_experiments` with `recovered`, `recovery_ms`, and `data_loss` flags.
