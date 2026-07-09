# SSO — OIDC & SAML

OpsEdge360 supports enterprise single sign-on per organization.

---

## Features

| Protocol | Flow | Use cases |
|----------|------|-----------|
| **OIDC** | Authorization code | Azure AD, Okta, Keycloak, Google Workspace |
| **SAML 2.0** | HTTP-Redirect + HTTP-POST ACS | ADFS, Okta SAML, Ping, older IdPs |

- Per-tenant providers (admin UI)
- Optional **global OIDC** via environment (on-prem / single-tenant)
- Auto-provisions users on first SSO login (`operator` role)
- Optional allowed email domains

---

## Callback URLs (register in IdP)

Replace host with your API base (`NEXT_PUBLIC_API_URL`):

| Protocol | URL |
|----------|-----|
| OIDC redirect URI | `{API}/api/v1/auth/sso/oidc/callback` |
| SAML ACS | `{API}/api/v1/auth/sso/saml/acs` |

Example:

```text
https://api.observability360.asoftechinsightz.com/api/v1/auth/sso/oidc/callback
https://api.observability360.asoftechinsightz.com/api/v1/auth/sso/saml/acs
```

Also set:

```env
OBS360_PUBLIC_URL=https://observability360.asoftechinsightz.com
OBS360_PUBLIC_API_URL=https://api.observability360.asoftechinsightz.com
```

---

## Configure in UI (multi-tenant)

1. Sign in as **admin**
2. Open **SSO settings** (`/settings/sso`)
3. Add **OIDC** or **SAML** provider
4. Users sign in at `/login`:
   - Enter **organization slug**
   - Click the SSO provider button

---

## Global OIDC (on-prem shortcut)

No UI required — set on the API gateway:

```env
SSO_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
SSO_OIDC_CLIENT_ID=xxxxxxxx
SSO_OIDC_CLIENT_SECRET=xxxxxxxx
SSO_OIDC_SCOPES=openid email profile
SSO_DEFAULT_TENANT=default
SSO_ALLOWED_DOMAINS=company.com
```

Login page shows **Enterprise OIDC**.

---

## OIDC fields

| Field | Example |
|-------|---------|
| Issuer | `https://accounts.google.com` or Azure/Okta issuer URL |
| Client ID | From IdP app registration |
| Client secret | From IdP |
| Scopes | `openid email profile` |
| Allowed domains | `acme.com,acme.co.uk` (optional) |

---

## SAML fields

| Field | Example |
|-------|---------|
| Entry point | IdP SSO URL |
| SP Entity ID | Optional; defaults to `{API}/saml/{providerId}` |
| IdP certificate | PEM X.509 from IdP |
| Allowed domains | Optional |

---

## APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/auth/sso/providers?tenant=acme` | Public |
| GET | `/auth/sso/oidc/start?tenant=&providerId=` | Public (redirect) |
| GET | `/auth/sso/oidc/callback` | Public |
| GET | `/auth/sso/saml/start?tenant=&providerId=` | Public (redirect) |
| POST | `/auth/sso/saml/acs` | Public |
| GET/POST/DELETE | `/auth/sso/admin/providers` | Admin JWT |

---

## Security notes

- Password login remains available unless you disable it operationally
- SSO users are created with role `operator` (promote to admin in DB if needed)
- SAML XML-DSig verification is best-effort; prefer OIDC when possible
- Use HTTPS in production for all callback URLs

---

## Prerequisites

```bash
npm run db:migrate   # applies 013_sso.sql
```

Postgres must be running.
