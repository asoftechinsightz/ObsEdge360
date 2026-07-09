import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Summary {
  total_energy: string;
  total_carbon: string;
  avg_pue: string;
  avg_renewable: string;
  idle_resources: string;
  efficiency_score: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  projected_savings_pct: string;
  projected_carbon_reduction_kg: string;
}

export default async function SustainabilityPage() {
  let summary: Summary = { total_energy: '0', total_carbon: '0', avg_pue: '1.5', avg_renewable: '0', idle_resources: '0', efficiency_score: '72' };
  let recommendations: Recommendation[] = [];

  try {
    const [s, r] = await Promise.all([
      fetchApi<Summary>('/sustainability/summary'),
      fetchApi<{ recommendations: Recommendation[] }>('/sustainability/recommendations'),
    ]);
    summary = s;
    recommendations = r.recommendations;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sustainability Intelligence</h1>
        <p className="text-sm text-slate-400">Energy, carbon, PUE, and efficiency recommendations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Energy (7d)', value: `${Number(summary.total_energy).toFixed(0)} kWh`, color: 'text-amber-400' },
          { label: 'Carbon (7d)', value: `${Number(summary.total_carbon).toFixed(0)} kg`, color: 'text-orange-400' },
          { label: 'PUE', value: Number(summary.avg_pue).toFixed(2), color: 'text-sky-400' },
          { label: 'Renewable', value: `${Number(summary.avg_renewable).toFixed(0)}%`, color: 'text-green-400' },
          { label: 'Idle Resources', value: summary.idle_resources, color: 'text-red-400' },
          { label: 'Efficiency', value: `${summary.efficiency_score}/100`, color: 'text-emerald-400' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className={`mt-2 text-xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">AI Recommendations</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-5">
              <h3 className="font-medium">{rec.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{rec.description}</p>
              <div className="mt-2 flex gap-4 text-xs text-emerald-400">
                <span>Savings: {rec.projected_savings_pct}%</span>
                <span>Carbon reduction: {rec.projected_carbon_reduction_kg} kg</span>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="p-5 text-sm text-slate-400">No pending recommendations.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
