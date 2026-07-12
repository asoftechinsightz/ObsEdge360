# 12 — UI Screen Catalog

**App:** `apps/web` (Next.js App Router) · **Count:** 99 `page.tsx` routes  
**Chrome:** `DashboardShell` · Admin: `AdminShell` + `AdminNav` · Copilot: panel (no route)

---

## Public / auth

| Route | File | Shell |
|-------|------|-------|
| `/` | `src/app/page.tsx` | none |
| `/login` | `src/app/login/page.tsx` | none |
| `/signup` | `src/app/signup/page.tsx` | none |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | none |
| `/reset-password` | `src/app/reset-password/page.tsx` | none |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | none |

## Executive / commercial / readiness

| Route | Label (nav or intended) |
|-------|-------------------------|
| `/dashboard` | Executive Home |
| `/reports` | Executive Reports |
| `/demo` | Evaluation Tours |
| `/security` | Security Center |
| `/pilot` | Pilot Package |
| `/rc1` | RC1 Readiness |
| `/rc2` | RC2 Readiness |
| `/rc3` | RC3 / EPP |
| `/commercial` | License & Trial |
| `/about` | About |
| `/marketplace` | Marketplace |
| `/preferences` | Preferences |

## Operations & topology

| Route | Label |
|-------|-------|
| `/discovery` | Discovery |
| `/discovery-ops` | Discovery Ops |
| `/twin` | Digital Twin |
| `/topology` | Topology |
| `/ops-intelligence` | Ops Intelligence |
| `/dashboards` | Ops Dashboards |
| `/dashboards/[id]` | Dashboard Studio |
| `/aiops` | AIOps / LLM RCA |
| `/cmdb` | CMDB |
| `/cmdb/drift` | CMDB Drift |
| `/itsm` | ITSM |
| `/transactions` | Transactions |
| `/transactions/[classification]` | Transaction detail |
| `/observability` | Observability |
| `/synthetics` | Synthetics |
| `/fleet` | Universal Agents |
| `/apm` | APM (+ Service Map tab) |
| `/network` | Network |
| `/ot` | OT / Industrial |
| `/compliance` | Compliance |
| `/banking360` | Banking360 (pack) |
| `/sustainability` | Sustainability |
| `/analytics` | Predictive Analytics |
| `/quantum` | Quantum Ready |
| `/governance` | Governance / HA-DR |
| `/agents` | AI Agents |
| `/settings/sso` | SSO settings |

## Administration

| Route | Title (AdminShell) |
|-------|--------------------|
| `/admin` | Platform Dashboard |
| `/admin/platform` | Platform Overview |
| `/admin/capacity` | Capacity Dashboard |
| `/admin/storage` | Storage Dashboard |
| `/admin/quotas` | Quota Management |
| `/admin/licenses` | License Center |
| `/admin/settings` | Platform Settings |
| `/admin/tenants` | Tenant Management |
| `/admin/security-policies` | Security Policies |
| `/admin/sessions` | Session Management |
| `/admin/password-policies` | Password Policies |
| `/admin/system/security` | System Security |
| `/admin/audit` | Audit Console |
| `/admin/secret-validation` | Secret Validation |
| `/admin/ops-health` | Operational Health |
| `/admin/health` | System Health |
| `/admin/ha` | HA Overview |
| `/admin/cluster` | Cluster Health |
| `/admin/nodes` | Cluster Nodes |
| `/admin/replication` | Replication Status |
| `/admin/failover` | Failover Events |
| `/admin/backup` | Backup Manager |
| `/admin/backup-verify` | Backup Verification |
| `/admin/backup-certification` | Backup Certification |
| `/admin/restore` | Restore Manager |
| `/admin/restore-certification` | Restore Certification |
| `/admin/deployment` | Deployment Center |
| `/admin/upgrade` | Upgrade Manager |
| `/admin/upgrade-status` | Upgrade Status |
| `/admin/runbooks` | Runbook Library |
| `/admin/approvals` | Approval Queue |
| `/admin/automation-dashboard` | Automation Dashboard |
| `/admin/workflows` | Workflow Designer |
| `/admin/executions` | Execution History |
| `/admin/emergency-stop` | Emergency Stop Console |
| `/admin/automation-history` | Automation History |
| `/admin/simulations` | Simulation Results |
| `/admin/automation` | Automation Policies |
| `/admin/policy-manager` | Policy Manager |
| `/admin/integrations` | Integration Dashboard |
| `/admin/connector-catalog` | Connector Catalog |
| `/admin/connector-config` | Connector Configuration |
| `/admin/connector-health` | Connector Health |
| `/admin/notification-channels` | Notification Channels |
| `/admin/delivery-history` | Delivery History |
| `/admin/identity-providers` | Identity Providers |
| `/admin/ldap-config` | LDAP Config |
| `/admin/saml-config` | SAML Configuration |
| `/admin/oidc-config` | OIDC Configuration |
| `/admin/sync-status` | Synchronization Status |
| `/admin/system/certification` | Certification Center |
| `/admin/system/release-candidate` | Release Candidate |
| `/admin/system/ga` | General Availability |
| `/admin/governance` | Governance Reports |

## Non-route surfaces

| Surface | Implementation |
|---------|----------------|
| Copilot | `CopilotPanel` |
| Notifications | `NotificationCenter` |
| Command Palette | `CommandPalette` |
| Environment banner | `EnvironmentBanner` |

## Missing vs enterprise expectation

| Expected | Status |
|----------|--------|
| Help Center | Missing |
| User Profile page | Missing (header label only) |
| API Explorer / Debug | Missing (needed as JSON home) |
| Dedicated `/incidents` | Embedded in Ops Intelligence |
| Favorites / Recents | Missing |
