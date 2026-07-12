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
  illustrative?: boolean;
  label?: string;
  coverageLabel?: string;
};

type Narrative = {
  what?: string;
  why?: string;
  impact?: string;
  owner?: string;
  next?: string;
  nextHref?: string;
  aiConfidence?: number;
  illustrative?: boolean;
  label?: string;
};

export function ExecutiveHomeApex() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [updated, setUpdated] = useState<Date>(new Date());
  const [fresh, setFresh] = useState<'live' | 'recent' | 'stale' | 'unknown'>('unknown');
  const [integrationHealth, setIntegrationHealth] = useState<'healthy' | 'degraded' | 'unknown'>('unknown');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [kpiRes, narrRes] = await Promise.allSettled([
        apiClient<Kpis>('/executive/kpis'),
        apiClient<Narrative>('/executive/narrative'),
      ]);
      if (cancelled) return;

      if (kpiRes.status === 'fulfilled') {
        setKpis(kpiRes.value);
        setFresh(kpiRes.value.illustrative ? 'recent' : 'live');
        setIntegrationHealth('healthy');
        setUpdated(new Date());
      } else {
        setFresh('unknown');
        setIntegrationHealth('unknown');
      }

      if (narrRes.status === 'fulfilled') {
        setNarrative(narrRes.value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const incidents = kpis?.activeIncidents ?? 0;
  const revenue = kpis?.revenueAtRisk ?? 0;
  const availability =
    kpis?.availability != null ? `${Number(kpis.availability).toFixed(2)}%` : null;
  const compliance = kpis?.complianceScore != null ? `${kpis.complianceScore}/100` : null;

  const happening =
    narrative?.what ??
    (incidents > 0
      ? `${incidents} active incident${incidents === 1 ? '' : 's'} requiring attention`
      : 'Platform operating within normal executive thresholds');
  const why =
    narrative?.why ??
    (incidents > 0
      ? 'Open incidents can cascade into SLA breach and customer impact if not owned quickly.'
      : 'Stable posture supports board-level confidence and continuous service delivery.');
  const impact =
    narrative?.impact ??
    (availability
      ? revenue > 0
        ? `≈ ₹${(revenue / 1000).toFixed(0)}K/hr revenue at risk · availability ${availability}${compliance ? ` · compliance ${compliance}` : ''}`
        : `Availability ${availability}${compliance ? ` · compliance ${compliance}` : ''}`
      : 'Executive KPIs loading — open Guided Evaluation if the estate is empty.');
  const nextAction = {
    label: narrative?.next ?? (incidents > 0 ? 'Investigate in Ops Intelligence' : 'Review CMDB Drift'),
    href: narrative?.nextHref ?? (incidents > 0 ? '/ops-intelligence' : '/cmdb/drift'),
  };

  return (
    <>
      <TrustBar
        lastUpdated={updated}
        freshness={fresh}
        dataSource={kpis?.label ?? (kpis ? 'Executive KPI APIs' : 'Awaiting executive signals')}
        coverageLabel={kpis?.coverageLabel ?? 'Enterprise services'}
        integrationHealth={integrationHealth}
        aiConfidence={narrative?.aiConfidence ?? (incidents > 0 ? 74 : 88)}
      />
      <ExecutiveNarrative
        happening={happening}
        whyItMatters={why}
        affectedService={narrative?.owner ?? 'See Business service health below'}
        impact={impact}
        nextAction={nextAction}
        aiConfidence={narrative?.aiConfidence ?? (incidents > 0 ? 74 : 88)}
      />
      <div className="mb-6">
        <InlineAiAssist
          title="AI executive brief"
          prompt="Produce a board-ready executive brief: what happened, why, business impact, owners, and recommended actions for OpsEdge360 current posture."
          context={JSON.stringify({
            availability: kpis?.availability,
            revenueAtRisk: kpis?.revenueAtRisk,
            activeIncidents: kpis?.activeIncidents,
            complianceScore: kpis?.complianceScore,
            openAlerts: kpis?.openAlerts,
            narrative,
          })}
        />
      </div>
    </>
  );
}
