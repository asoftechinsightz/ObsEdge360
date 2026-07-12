'use client';

import { useEffect, useState } from 'react';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { TrustBar } from '@/components/apex/TrustBar';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { apiClient } from '@/lib/api-client';

type Kpis = {
  availability?: number;
  revenueAtRisk?: number;
  activeIncidents?: number;
  complianceScore?: number;
  openAlerts?: number;
};

export function ExecutiveHomeApex() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [updated, setUpdated] = useState<Date>(new Date());
  const [fresh, setFresh] = useState<'live' | 'stale' | 'unknown'>('unknown');

  useEffect(() => {
    apiClient<Kpis>('/executive/kpis')
      .then((d) => {
        setKpis(d);
        setUpdated(new Date());
        setFresh('live');
      })
      .catch(() => setFresh('stale'));
  }, []);

  const incidents = kpis?.activeIncidents ?? 0;
  const revenue = kpis?.revenueAtRisk ?? 0;
  const happening =
    incidents > 0
      ? `${incidents} active incident${incidents === 1 ? '' : 's'} requiring attention`
      : 'Platform operating within normal executive thresholds';
  const why =
    incidents > 0
      ? 'Open incidents can cascade into SLA breach and customer impact if not owned quickly.'
      : 'Stable posture supports board-level confidence and continuous service delivery.';
  const impact =
    revenue > 0
      ? `≈ ₹${(revenue / 1000).toFixed(0)}K/hr revenue at risk · availability ${kpis?.availability ?? '—'}%`
      : `Availability ${kpis?.availability ?? '—'}% · compliance ${kpis?.complianceScore ?? '—'}/100`;

  return (
    <>
      <TrustBar
        lastUpdated={updated}
        freshness={fresh}
        dataSource="Executive KPI APIs"
        coverageLabel="Enterprise services"
        integrationHealth={fresh === 'live' ? 'healthy' : 'degraded'}
        aiConfidence={incidents > 0 ? 74 : 88}
      />
      <ExecutiveNarrative
        happening={happening}
        whyItMatters={why}
        affectedService="See Business service health below"
        impact={impact}
        nextAction={
          incidents > 0
            ? { label: 'Investigate in Ops Intelligence', href: '/ops-intelligence' }
            : { label: 'Review executive reports', href: '/reports' }
        }
        aiConfidence={incidents > 0 ? 74 : 88}
      />
      <div className="mb-6">
        <InlineAiAssist
          title="AI executive brief"
          prompt="Produce a board-ready executive brief for OpsEdge360 current posture."
          context={JSON.stringify({
            availability: kpis?.availability,
            revenueAtRisk: kpis?.revenueAtRisk,
            activeIncidents: kpis?.activeIncidents,
            complianceScore: kpis?.complianceScore,
            openAlerts: kpis?.openAlerts,
          })}
        />
      </div>
    </>
  );
}
