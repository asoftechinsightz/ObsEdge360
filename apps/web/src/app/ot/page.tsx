import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface OtZone {
  id: string;
  name: string;
  zone_level: string;
  read_only: boolean;
  max_poll_rate_hz: string;
  requires_ot_engineer_approval: boolean;
}

export default async function OtPage() {
  let zones: OtZone[] = [];
  let otAssets = 0;

  try {
    const [zoneData, ciData] = await Promise.all([
      fetchApi<{ zones: OtZone[] }>('/remediation/ot/zones'),
      fetchApi<{ total: number }>('/cmdb/cis?ciType=ot_device'),
    ]);
    zones = zoneData.zones;
    otAssets = ciData.total;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">OT & Industrial</h1>
        <p className="text-sm text-slate-400">
          OPC-UA, Modbus, MQTT discovery — read-only, safety-zone protected · {otAssets} OT assets
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {zones.map((zone) => (
          <div key={zone.id} className="kpi-card">
            <h3 className="font-semibold">{zone.name}</h3>
            <div className="mt-3 space-y-1 text-sm text-slate-400">
              <div>Level: <span className="text-slate-200 capitalize">{zone.zone_level}</span></div>
              <div>Read-only: <span className={zone.read_only ? 'text-emerald-400' : 'text-red-400'}>{zone.read_only ? 'Yes' : 'No'}</span></div>
              <div>Max poll rate: <span className="text-slate-200">{zone.max_poll_rate_hz} Hz</span></div>
              <div>OT approval: <span className="text-slate-200">{zone.requires_ot_engineer_approval ? 'Required' : 'Not required'}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-slate-300">
        <strong className="text-amber-400">OT Safety:</strong> All industrial connectors operate in read-only mode by default.
        Remediation on OT assets requires <code className="text-xs">ot_zone_safe</code> runbooks and OT engineer approval for production zones.
      </div>
    </DashboardShell>
  );
}
