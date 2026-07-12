# Known Issues — Phase 4 RC1

1. Browser synthetics Chromium worker remains optional; Phase 3 browser-sim + HTTP navigation probe is default.
2. MFA verification uses a deterministic challenge code path for RC1 lab validation; production should integrate standard TOTP (e.g. otplib) and WebAuthn.
3. SMS notification connector is planned (marketplace registry), not live delivery.
4. Helm chart remains gateway/web-centric vs full Compose microservice set.
5. Cloud KMS secret providers remain interface stubs.
6. Full multi-region active-active DR is validated via operator HA drills, not automatic failover SaaS.
7. Accessibility: foundations improved (aria on states/banner); full WCAG audit is continuous.
8. PDF/Excel report binaries are JSON/CSV exports in this RC; native PDF rendering can plug into report payload later.
