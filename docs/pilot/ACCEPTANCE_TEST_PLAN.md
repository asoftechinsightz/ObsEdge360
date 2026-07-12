# Acceptance Test Plan

**Purpose:** Customer-witnessed acceptance for EPP.  
**Environment:** Pilot instance (record URL + SHA).

| ID | Test | Steps | Expect | Pass |
|----|------|-------|--------|------|
| AT-01 | Health | `GET /api/v1/health` | 200 healthy | ☐ |
| AT-02 | Branding | `GET /api/v1/branding` | product OpsEdge360 | ☐ |
| AT-03 | Signup/Login | Create admin, login | JWT issued | ☐ |
| AT-04 | MFA enroll | `/security` enroll+verify TOTP | Backup codes shown | ☐ |
| AT-05 | MFA login | Policy required → login | MFA challenge then token | ☐ |
| AT-06 | Session revoke | Revoke session → call `/auth/me` | 401 Session revoked | ☐ |
| AT-07 | Demo reset | `/demo` confirm reset | Tours usable | ☐ |
| AT-08 | Banking360 | Open `/banking360`, run pack view | Score/controls visible | ☐ |
| AT-09 | Backup | Run backup script | Dump created | ☐ |
| AT-10 | Validate | `bash scripts/vps-rc3-validate.sh` | `RC3_EPP_VALIDATION_OK` | ☐ |

**Witness:** _____________ **SHA:** _____________ **Date:** _____________
