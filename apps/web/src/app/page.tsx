import Link from 'next/link';
import {
  Activity, Shield, Database, GitBranch, Bot, CheckCircle, ArrowRight, Radio, Factory,
} from 'lucide-react';

const FEATURES = [
  { icon: Database, title: 'CMDB & Discovery', desc: 'Auto-discover assets across cloud, network, and OT.' },
  { icon: Activity, title: 'Full-stack Observability', desc: 'Metrics, logs, traces, and network flows in one place.' },
  { icon: GitBranch, title: 'Business Transactions', desc: 'End-to-end flow monitoring with revenue impact.' },
  { icon: Shield, title: 'Security & Compliance', desc: 'Fraud detection, SIEM, RBI/PCI frameworks.' },
  { icon: Factory, title: 'OT / Industrial', desc: 'OPC-UA, Modbus, MQTT connectors for plant floor.' },
  { icon: Bot, title: 'AI Operations', desc: 'Autonomous agents for RCA and remediation.' },
];

const METRICS = [
  { value: '12+', label: 'Microservices' },
  { value: '99.9%', label: 'SLA target' },
  { value: '3', label: 'Deploy modes' },
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-white">O</div>
            <span className="font-semibold">OpsEdge360</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-400 hover:text-white">Sign in</Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">Standalone enterprise observability</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          See everything. Fix faster.{' '}
          <span className="text-primary">Operate with confidence.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          IT, OT, cloud, network, security, and business transactions — unified in one intelligent platform.
          Separate from CRM. Built for operators, CISOs, and SRE teams.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark"
          >
            Get started <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-600 px-6 py-3 font-medium text-slate-300 hover:border-slate-500"
          >
            Sign in to console
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {METRICS.map((m) => (
            <div key={m.label}>
              <div className="text-2xl font-bold text-primary">{m.value}</div>
              <div className="text-xs text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800 bg-surface-elevated/50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-10 text-center text-2xl font-semibold">Everything you need to observe the enterprise</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-700 bg-surface p-6">
                <Icon className="mb-3 text-primary" size={24} />
                <h3 className="font-medium">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-primary/10 to-accent/10 p-10 text-center">
          <CheckCircle className="mx-auto mb-4 text-primary" size={32} />
          <h2 className="text-2xl font-semibold">SaaS · Hybrid · On-premises</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            One codebase, three deployment topologies. Banking360 industry pack for regulated BFSI workloads.
          </p>
          <Link href="/signup" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark">
            Create your organization
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>OpsEdge360 by AsoftechInsightz · Separate from LeadEdge360 & RetailEdge360</p>
        <p className="mt-1 flex items-center justify-center gap-4">
          <Radio size={14} className="inline" /> observability360.asoftechinsightz.com
        </p>
      </footer>
    </div>
  );
}
