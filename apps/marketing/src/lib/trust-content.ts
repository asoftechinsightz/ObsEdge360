/** Trust, security, DPDP, and compliance content for the marketing site.
 * Status values: capability | alignment | roadmap
 * Do not claim certification unless verified.
 */

export type ComplianceStatus = 'capability' | 'alignment' | 'roadmap';

export const SECURITY_CAPABILITIES = [
  { t: 'Secure by Design', d: 'Controls built into product and platform layers' },
  { t: 'Privacy by Design', d: 'Purpose-aware data handling and minimization posture' },
  { t: 'Governance by Design', d: 'Policy, roles, and audit trails as first-class features' },
  { t: 'Zero Trust Orientation', d: 'Verify identity and least privilege across access paths' },
  { t: 'Identity & Access', d: 'Enterprise identity model across suite products' },
  { t: 'Single Sign-On', d: 'SSO-ready authentication for enterprise estates' },
  { t: 'Multi-Factor Auth', d: 'MFA support for elevated assurance scenarios' },
  { t: 'RBAC', d: 'Role-based access aligned to tenant boundaries' },
  { t: 'Encryption in Transit', d: 'TLS for client and service communication' },
  { t: 'Encryption at Rest', d: 'Protected platform data stores' },
  { t: 'API Security', d: 'Authenticated, authorized integration surfaces' },
  { t: 'Audit Logs', d: 'Traceable access and administrative activity' },
  { t: 'Secrets Management', d: 'Controlled handling of credentials and tokens' },
  { t: 'Backup & DR', d: 'Backup routines with recovery procedures' },
  { t: 'Business Continuity', d: 'Documented continuity patterns for critical services' },
  { t: 'AI Governance', d: 'Scoped, human-reviewable assistive intelligence' },
  { t: 'Continuous Monitoring', d: 'Observability for platform health and risk signals' },
] as const;

export const DPDP_CAPABILITIES = [
  'Privacy by Design',
  'Consent management integration points',
  'Data classification support',
  'Purpose limitation support',
  'Data minimization posture',
  'Data retention policy support',
  'Right to access support',
  'Right to correction support',
  'Right to erasure support',
  'Audit trails',
  'Data lineage support',
  'Encryption',
  'RBAC',
  'MFA',
  'Activity monitoring',
  'Incident response workflows',
] as const;

export const COMPLIANCE_INDIA: { name: string; status: ComplianceStatus; note: string }[] = [
  {
    name: 'Digital Personal Data Protection (DPDP) Act, 2023',
    status: 'alignment',
    note: 'Platform capabilities designed to support customer DPDP programs — not a certification claim.',
  },
  {
    name: 'CERT-In Directions',
    status: 'alignment',
    note: 'Incident-aware logging and response workflow support for customer obligations.',
  },
  {
    name: 'RBI Cyber Security & Digital Banking Guidelines',
    status: 'alignment',
    note: 'Control themes mapped for banking and NBFC solution packs.',
  },
  {
    name: 'RBI IT Governance & Outsourcing Guidelines',
    status: 'alignment',
    note: 'Governance and vendor-oversight patterns for regulated deployments.',
  },
  {
    name: 'NPCI Security Guidelines',
    status: 'roadmap',
    note: 'Applicable where payment rails are in customer scope.',
  },
  {
    name: 'UIDAI',
    status: 'roadmap',
    note: 'Applicable only when customer programs integrate Aadhaar flows.',
  },
  {
    name: 'MeitY Best Practices',
    status: 'alignment',
    note: 'Secure development and cloud posture guidance.',
  },
];

export const COMPLIANCE_GLOBAL: { name: string; status: ComplianceStatus; note: string }[] = [
  { name: 'GDPR', status: 'alignment', note: 'Privacy and rights-supportive platform capabilities.' },
  { name: 'ISO/IEC 27001', status: 'roadmap', note: 'Alignment roadmap — not stated as certified.' },
  { name: 'ISO/IEC 27701', status: 'roadmap', note: 'Privacy management alignment roadmap.' },
  { name: 'SOC 2 Type II', status: 'roadmap', note: 'Assurance roadmap — not stated as certified.' },
  { name: 'NIST Cybersecurity Framework', status: 'alignment', note: 'Identify / protect / detect / respond themes.' },
  { name: 'CIS Controls', status: 'alignment', note: 'Foundational hardening practices.' },
  { name: 'OWASP Top 10', status: 'capability', note: 'Secure SDLC and application review orientation.' },
  { name: 'OAuth 2.0', status: 'capability', note: 'Modern authorization protocols.' },
  { name: 'OpenID Connect', status: 'capability', note: 'Enterprise identity federation patterns.' },
  { name: 'SAML 2.0', status: 'capability', note: 'SSO interoperability for enterprise IdPs.' },
  { name: 'WCAG 2.2 Accessibility', status: 'alignment', note: 'Accessibility as an ongoing product standard.' },
  { name: 'OpenTelemetry', status: 'capability', note: 'Open observability instrumentation.' },
];

export const TRUST_CENTER_NAV = [
  { id: 'overview', title: 'Security Overview' },
  { id: 'privacy', title: 'Privacy' },
  { id: 'dpdp', title: 'DPDP Act Ready' },
  { id: 'compliance', title: 'Compliance' },
  { id: 'rai', title: 'Responsible AI' },
  { id: 'residency', title: 'Data Residency' },
  { id: 'availability', title: 'Service Availability' },
  { id: 'architecture', title: 'Architecture' },
  { id: 'incident', title: 'Incident Management' },
  { id: 'sla', title: 'Support SLAs' },
  { id: 'releases', title: 'Release Notes' },
  { id: 'contact', title: 'Security Contact' },
] as const;

export const POSITIONING_SIGNALS = [
  'Enterprise Ready',
  'AI Powered',
  'Secure',
  'Scalable',
  'Compliance Aware',
  'API First',
  'Cloud Native',
  'Business Outcome Driven',
  'Trusted Technology Partner',
] as const;
