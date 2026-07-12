import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { EmptyState } from '@/components/UiStates';

interface Service {
  id: string;
  name: string;
  tier: number;
  availability: number;
  slaTarget: number;
  status: string;
  owner?: string;
}

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-emerald-500/20 text-emerald-400',
  degraded: 'bg-amber-500/20 text-amber-400',
  at_risk: 'bg-red-500/20 text-red-400',
};

export async function ServiceHealthTable() {
  let services: Service[] = [];
  try {
    services = await fetchApi<Service[]>('/executive/services');
  } catch {
    services = [];
  }

  return (
    <div className="eig-glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--eig-border)] px-5 py-4">
        <h2 className="font-semibold">Business service health</h2>
        <Link href="/transactions" className="text-xs text-sky-400 hover:underline">
          View journeys
        </Link>
      </div>
      {!services.length ? (
        <div className="p-4">
          <EmptyState
            title="No business services to display"
            hint="Run Discovery to populate CMDB assets, then map tier-1 services — or open Evaluation Tours in Developer Mode."
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/discovery" className="text-sky-400 hover:underline">
              Set up Discovery →
            </Link>
            <Link href="/cmdb" className="text-sky-400 hover:underline">
              Open CMDB →
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3">Availability</th>
                <th className="px-5 py-3">SLA Target</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-slate-700 px-2 py-0.5 text-xs">Tier {s.tier}</span>
                  </td>
                  <td className="px-5 py-3">{s.availability}%</td>
                  <td className="px-5 py-3 text-slate-400">{s.slaTarget}%</td>
                  <td className="px-5 py-3 text-slate-400">{s.owner ?? 'Unassigned'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[s.status] ?? ''}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link href="/ops-intelligence" className="text-xs text-sky-400 hover:underline">
                      Investigate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
