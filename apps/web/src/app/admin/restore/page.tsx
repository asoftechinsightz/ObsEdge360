'use client';

import { AdminShell } from '../AdminShell';

export default function AdminRestorePage() {
  return (
    <AdminShell title="Restore Manager">
      <div className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-5 text-sm text-slate-300">
        <p>Restore is a host-operator action for safety (no remote destructive API in Wave 1).</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Stop writers: gateway + services (keep postgres if needed).</li>
          <li>Run <code>scripts/restore-postgres.sh &lt;backup.sql.gz&gt;</code>.</li>
          <li>Recreate app services via <code>scripts/vps-deploy-latest.sh</code> or compose up.</li>
          <li>Validate health + smoke; record result under Backup history notes.</li>
        </ol>
        <p className="text-amber-200">See docs/admin/OPERATIONS_GUIDE.md and docs/architecture/ENTERPRISE_DEPLOYMENT.md.</p>
      </div>
    </AdminShell>
  );
}
