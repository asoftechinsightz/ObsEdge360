import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';

interface Summary {
  forecastCount: number;
  activePredictions: number;
  highRiskPredictions: number;
  totalRevenueAtRisk: number;
  modelVersion: string;
}

interface Forecast {
  id: string;
  forecastType: string;
  metricName: string;
  horizonDays: number;
  forecastPoints: Array<{ day: number; value: number }>;
  confidenceLow: Array<{ day: number; value: number }>;
  confidenceHigh: Array<{ day: number; value: number }>;
  businessImpact: { revenueAtRisk?: number; slaBreachProbability?: number };
}

interface Prediction {
  id: string;
  incidentType: string;
  probabilityPct: number;
  revenueAtRisk?: number;
  rootCauseHypothesis?: string;
  confidencePct?: number;
  predictedWindowStart: string;
}

export default async function AnalyticsPage() {
  let summary: Summary = { forecastCount: 0, activePredictions: 0, highRiskPredictions: 0, totalRevenueAtRisk: 0, modelVersion: 'prophet-lite-v1' };
  let forecasts: Forecast[] = [];
  let predictions: Prediction[] = [];

  try {
    const [s, f, p] = await Promise.all([
      fetchApi<Summary>('/analytics/summary'),
      fetchApi<{ forecasts: Forecast[] }>('/analytics/forecasts'),
      fetchApi<{ predictions: Prediction[] }>('/analytics/incidents'),
    ]);
    summary = s;
    forecasts = f.forecasts;
    predictions = p.predictions;
  } catch {
    // fallback
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Predictive Analytics</h1>
        <p className="text-sm text-slate-400">7-day incident and capacity forecasts with confidence intervals — {summary.modelVersion}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active Forecasts', value: summary.forecastCount, color: 'text-sky-400' },
          { label: 'Incident Predictions', value: summary.activePredictions, color: 'text-amber-400' },
          { label: 'High Risk (≥70%)', value: summary.highRiskPredictions, color: 'text-red-400' },
          { label: 'Revenue at Risk', value: `₹${(summary.totalRevenueAtRisk / 1000).toFixed(0)}K`, color: 'text-orange-400' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="text-xs text-slate-400">{card.label}</div>
            <div className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {predictions.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="mb-3 font-semibold text-red-400">Predicted Incidents</h2>
          {predictions.map((p) => (
            <div key={p.id} className="mb-3 rounded-lg bg-surface-elevated p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{p.incidentType.replace(/_/g, ' ')}</span>
                <span className="text-lg font-bold text-red-400">{p.probabilityPct}%</span>
              </div>
              {p.rootCauseHypothesis && <p className="mt-1 text-sm text-slate-400">{p.rootCauseHypothesis}</p>}
              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                {p.revenueAtRisk && <span>Revenue at risk: ₹{(p.revenueAtRisk / 1000).toFixed(0)}K</span>}
                {p.confidencePct && <span>Model confidence: {p.confidencePct}%</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold">7-Day Forecasts</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th className="px-5 py-3">Metric</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Day 7 Forecast</th>
              <th className="px-5 py-3">CI Range</th>
              <th className="px-5 py-3">Revenue at Risk</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((f) => {
              const day7 = f.forecastPoints[6];
              const low7 = f.confidenceLow[6];
              const high7 = f.confidenceHigh[6];
              return (
                <tr key={f.id} className="border-b border-slate-700/50">
                  <td className="px-5 py-3">{f.metricName}</td>
                  <td className="px-5 py-3 capitalize">{f.forecastType}</td>
                  <td className="px-5 py-3 font-medium text-amber-400">{day7?.value ?? '—'}%</td>
                  <td className="px-5 py-3 text-slate-400">{low7?.value}–{high7?.value}%</td>
                  <td className="px-5 py-3">₹{((f.businessImpact.revenueAtRisk ?? 0) / 1000).toFixed(0)}K</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
