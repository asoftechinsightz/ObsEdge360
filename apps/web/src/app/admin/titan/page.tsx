'use client';

import Link from 'next/link';
import { AdminShell } from '../AdminShell';
import { TrustBar } from '@/components/apex/TrustBar';
import { PageHeader } from '@/components/eig/primitives';

const STREAMS: { title: string; desc: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'WS1 · Production Operations',
    desc: 'Monitoring, SLA, backup, upgrade, DR, capacity, release health',
    links: [
      { href: '/admin/ops-health', label: 'Ops Health' },
      { href: '/admin/health', label: 'System Health' },
      { href: '/admin/backup-verify', label: 'Backup Verify' },
      { href: '/admin/upgrade', label: 'Upgrade' },
      { href: '/admin/ha', label: 'HA' },
      { href: '/admin/capacity', label: 'Capacity' },
      { href: '/admin/system/ga', label: 'GA / Release' },
    ],
  },
  {
    title: 'WS2 · Enterprise Support',
    desc: 'Diagnostics, ITSM, feedback, health reports',
    links: [
      { href: '/itsm', label: 'ITSM' },
      { href: '/admin/cvp/feedback', label: 'CVP Feedback' },
      { href: '/reports', label: 'Reports' },
      { href: '/developer', label: 'Developer / Vitals' },
    ],
  },
  {
    title: 'WS3 · Customer Adoption',
    desc: 'Onboarding, demos, help, success scores',
    links: [
      { href: '/demo', label: 'Executive Demo' },
      { href: '/help', label: 'Help Center' },
      { href: '/admin/cvp/success', label: 'CS Dashboard' },
      { href: '/discovery', label: 'Discovery Wizard' },
    ],
  },
  {
    title: 'WS4 · Product Analytics',
    desc: 'Privacy-safe aggregated adoption metrics',
    links: [{ href: '/admin/cvp/analytics', label: 'CVP Analytics' }],
  },
  {
    title: 'WS5 · Scalability',
    desc: 'Capacity, cluster, HA verification',
    links: [
      { href: '/admin/capacity', label: 'Capacity' },
      { href: '/admin/cluster', label: 'Cluster' },
      { href: '/admin/nodes', label: 'Nodes' },
      { href: '/admin/ha', label: 'HA' },
    ],
  },
  {
    title: 'WS6 · Enterprise Integrations',
    desc: 'Strengthen Entra, ITSM, chat, cloud, OTel — not vanity connectors',
    links: [
      { href: '/admin/integrations', label: 'Integrations' },
      { href: '/admin/identity-providers', label: 'Identity Providers' },
      { href: '/admin/notification-channels', label: 'Notifications' },
      { href: '/admin/connector-health', label: 'Connector Health' },
      { href: '/settings/sso', label: 'SSO Settings' },
    ],
  },
  {
    title: 'WS7–8 · Reference & Evidence',
    desc: 'Industry blueprints + pilot evidence → case studies & v1.1',
    links: [
      { href: '/admin/cvp/pilots', label: 'Pilot Registry' },
      { href: '/admin/cvp/feature-board', label: 'Feature Board' },
      { href: '/admin/cvp', label: 'CVP Overview' },
      { href: '/banking360', label: 'Banking360 Pack' },
    ],
  },
];

export default function TitanHubPage() {
  return (
    <AdminShell
      title="Program TITAN"
      subtitle="Enterprise Scale & Customer Success — support paying customers at scale (not Phase 5)"
    >
      <PageHeader
        title="TITAN command hub"
        purpose="Map existing production, support, adoption, and evidence capabilities. No speculative modules."
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness="live"
        dataSource="Existing admin · CVP · commercial docs"
        coverageLabel="Freeze-aligned · dual-customer roadmap rule"
      />
      <div className="mb-6 eig-panel p-4 text-sm text-slate-300">
        <p className="font-medium text-slate-100">Roadmap discipline</p>
        <p className="mt-1 text-xs text-slate-400">
          No major feature enters the roadmap unless at least two pilot customers independently request it, or it is a
          critical operational / security / compliance requirement. Docs: <code className="text-slate-300">docs/titan/</code>
        </p>
        <p className="mt-2 text-xs text-amber-200/90">
          Six-month focus: 3–5 pilots → ≥2 production → 2–3 case studies → v1.1 from evidence only → then consider adjacent products.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {STREAMS.map((s) => (
          <div key={s.title} className="eig-glass p-4">
            <h2 className="font-semibold text-slate-100">{s.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-2.5 py-1 text-xs text-sky-300 hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
