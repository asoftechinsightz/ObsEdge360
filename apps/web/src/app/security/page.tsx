import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Posture {
  activeThreats: number;
  fraudAlerts: number;
  anomalies: number;
  postureScore: number;
  vulnerabilities: number;
}

interface FraudAlert {
  id: string;
  title: string;
  severity: string;
  alertType: string;
  confidenceScore?: number;
  reasonCodes?: string[];
  explainability?: Record<string, unknown>;
}

export default async function SecurityPage() {
  let posture: Posture = { activeThreats: 0, fraudAlerts: 0, anomalies: 0, postureScore: 78, vulnerabilities: 47 };
  let fraudAlerts: FraudAlert[] = [];
  let anomalies: Array<{ id: string; metricName?: string; deviationSigma?: number; severity: string }> = [];

  try {
    const [p, f, a] = await Promise.all([
      fetchApi<Posture>('/security/posture'),
      fetchApi<{ alerts: FraudAlert[] }>('/security/fraud'),
      fetchApi<{ anomalies: typeof anomalies }>('/security/anomalies'),
    ]);
    posture = p;
    fraudAlerts = f.alerts;
    anomalies = a.anomalies;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Security Intelligence</h1>
        <p className="text-sm text-slate-400">Fraud detection, anomalies, SIEM correlation — explainable AI</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'SIEM Events', value: posture.activeThreats, color: 'text-red-400' },
          { label: 'Fraud Alerts', value: posture.fraudAlerts, color: 'text-amber-400' },
          { label: 'Anomalies', value: posture.anomalies, color: 'text-orange-400' },
          { label: 'Posture Score', value: posture.postureScore, color: 'text-sky-400' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {fraudAlerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="mb-3 font-semibold text-amber-400">Fraud Alerts</h2>
          {fraudAlerts.map((alert) => (
            <div key={alert.id} className="mb-3 rounded-lg bg-surface-elevated p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400 capitalize">{alert.severity}</span>
                <span className="text-sm font-medium">{alert.title}</span>
              </div>
              {alert.reasonCodes && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {alert.reasonCodes.map((code) => (
                    <span key={code} className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{code}</span>
                  ))}
                </div>
              )}
              {alert.confidenceScore && (
                <p className="mt-1 text-xs text-slate-400">Confidence: {alert.confidenceScore}%</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">Infrastructure Anomalies</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th className="px-5 py-3">Metric</th>
              <th className="px-5 py-3">Deviation</th>
              <th className="px-5 py-3">Severity</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.id} className="border-b border-slate-700/50">
                <td className="px-5 py-3">{a.metricName ?? '—'}</td>
                <td className="px-5 py-3">{a.deviationSigma?.toFixed(1) ?? '—'}σ</td>
                <td className="px-5 py-3 capitalize text-amber-400">{a.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
