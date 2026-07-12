# Known Issues — RC2

Accepted residuals (disclosed; not release blockers for controlled pilots):

| ID | Issue | Workaround |
|----|-------|------------|
| KI-01 | Session revoke does not kill active JWTs | Shorten JWT TTL; force password reset on incident |
| KI-02 | MFA secrets plaintext in DB | Restrict DB; plan encrypt-at-rest |
| KI-03 | Device labels always `web` | Use Wave6 admin for richer session views if needed |
| KI-04 | Older pages may lack shared empty/error states | Prefer RC2 surfaces for demos |

See also [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) and audit A-08/A-12/A-15 deferred items.
