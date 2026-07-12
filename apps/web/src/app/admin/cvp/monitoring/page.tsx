'use client';

import Link from 'next/link';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { TrustBar } from '@/components/apex/TrustBar';

const LINKS = [
  { href: '/admin/ops-health', label: 'Operational Health', desc: 'Support-facing ops health' },
  { href: '/admin/health', label: 'System Health', desc: 'Availability / component health' },
  { href: '/admin/ha', label: 'High Availability', desc: 'HA posture' },
  { href: '/admin/cluster', label: 'Cluster', desc: 'Node & cluster status' },
  { href: '/admin/replication', label: 'Replication', desc: 'Data replication' },
  { href: '/admin/backup', label: 'Backup', desc: 'Backup jobs' },
  { href: '/admin/integrations', label: 'Integrations', desc: 'Integration status' },
  { href: '/admin/connector-health', label: 'Connector Health', desc: 'Connector availability' },
  { href: '/aiops', label: 'AIOps', desc: 'AI service health / RCA' },
  { href: '/developer', label: 'Developer Mode · Vitals', desc: 'LCP / INP / CLS session samples' },
];

export default function CvpMonitoringPage() {
  return (
    <AdminShell title="Production Monitoring" subtitle="Platform self-observability for support teams — reuse existing admin surfaces">
      <CvpNav />
      <TrustBar
        lastUpdated={new Date()}
        freshness="live"
        dataSource="Existing admin & AIOps routes"
        coverageLabel="Availability · errors · latency · jobs · AI · integrations"
      />
      <p className="mb-4 text-sm text-slate-400">
        CVP does not duplicate monitoring backends. Use these operational dashboards; attach pilot incidents in Feedback.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="eig-glass block p-4 transition hover:-translate-y-0.5">
            <div className="font-medium text-slate-100">{l.label}</div>
            <p className="mt-1 text-xs text-slate-500">{l.desc}</p>
            <div className="mt-2 text-[11px] text-sky-400">{l.href}</div>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
