'use client';

import Link from 'next/link';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';

const DOCS = [
  { title: 'FAQs', path: 'docs/cvp/kb/FAQ.md' },
  { title: 'Troubleshooting', path: 'docs/cvp/kb/TROUBLESHOOTING.md' },
  { title: 'Best Practices', path: 'docs/cvp/kb/BEST_PRACTICES.md' },
  { title: 'Deployment Guides', path: 'docs/cvp/kb/DEPLOYMENT.md' },
  { title: 'Runbooks', path: 'docs/cvp/kb/RUNBOOKS.md' },
  { title: 'Architecture Diagrams', path: 'docs/cvp/kb/ARCHITECTURE.md' },
  { title: 'Upgrade Notes', path: 'docs/cvp/kb/UPGRADE_NOTES.md' },
  { title: 'Video Placeholders', path: 'docs/cvp/kb/VIDEOS.md' },
  { title: 'Pilot Toolkit', path: 'docs/pilot/README.md' },
  { title: 'GTM / CS Kit', path: 'docs/gtm/README.md' },
];

export default function CvpKnowledgePage() {
  return (
    <AdminShell title="Customer Knowledge Base" subtitle="Structured repository for pilots and support">
      <CvpNav />
      <p className="mb-4 text-sm text-slate-400">
        Knowledge content lives in the repo for reviewability. Link customers to published packs; keep this index for internal CS.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((d) => (
          <div key={d.path} className="eig-glass p-4">
            <div className="font-medium text-slate-100">{d.title}</div>
            <code className="mt-2 block text-[11px] text-slate-500">{d.path}</code>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">
        Also see <Link className="text-sky-400 hover:underline" href="/help">Help Center</Link> and{' '}
        <Link className="text-sky-400 hover:underline" href="/pilot">Pilot Package</Link>.
      </div>
    </AdminShell>
  );
}
