# Known Limitations — RC2 Pilot

1. Browser synthetics default to HTTP navigation + waterfall simulation (Chromium worker optional).
2. Performance benchmarks in RC2 are capacity models; full soak is Wave 7 gated.
3. Risk-based authentication records scores; automatic step-up policies are MFA-mode driven.
4. SMS notifications planned; email/webhook live.
5. PDF binaries not native; CSV/JSON exports available.
6. Historical PostgreSQL database name `trinetra360` remains the production alias.
7. Helm chart is gateway/web-centric vs full Compose set.
