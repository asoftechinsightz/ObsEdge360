'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database, Plus, Trash2, Pencil, RefreshCw, Download, Upload,
  Link2, BarChart3, Search, X,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient, getApiUrl, getAuthTokenFromDocument } from '@/lib/api-client';
import clsx from 'clsx';

const CI_TYPES = [
  'server', 'vm', 'container', 'pod', 'database', 'application', 'service',
  'network_device', 'firewall', 'load_balancer', 'ot_device', 'cloud_resource',
  'api', 'queue', 'cache', 'user', 'location', 'saas_app',
] as const;

const CI_STATUSES = ['discovered', 'active', 'maintenance', 'decommissioned'] as const;

const REL_TYPES = [
  'depends_on', 'runs_on', 'connects_to', 'owned_by', 'part_of', 'secures', 'monitors', 'calls',
] as const;

interface Ci {
  id: string;
  name: string;
  ciType: string;
  status: string;
  healthScore: number;
  complianceScore: number;
  riskScore: number;
  aiConfidenceScore: number;
  externalId?: string;
  tags?: string[];
}

interface Relationship {
  id: string;
  sourceCiId: string;
  targetCiId: string;
  relationshipType: string;
  strength: string;
}

interface Stats {
  totalAssets: number;
  avgHealth: number;
  openAlerts: number;
  relationships: number;
  activeAssets: number;
  atRiskAssets: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

type Tab = 'items' | 'relationships' | 'stats' | 'io';

function healthColor(score: number) {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-red-400';
}

const emptyForm = {
  name: '',
  ciType: 'server',
  status: 'active',
  healthScore: 100,
  complianceScore: 100,
  riskScore: 0,
  externalId: '',
};

export default function CmdbPage() {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<Ci[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<Ci | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [relForm, setRelForm] = useState({
    sourceCiId: '',
    targetCiId: '',
    relationshipType: 'depends_on',
    strength: 'normal',
  });
  const [importText, setImportText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('ciType', typeFilter);
      const qs = params.toString() ? `?${params}` : '';

      const [cis, rels, st] = await Promise.all([
        apiClient<{ items: Ci[] }>(`/cmdb/cis${qs}`),
        apiClient<{ relationships: Relationship[] }>('/cmdb/relationships'),
        apiClient<Stats>('/cmdb/stats'),
      ]);
      setItems(cis.items);
      setRelationships(rels.relationships);
      setStats(st);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load CMDB');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ci of items) map.set(ci.id, ci.name);
    return map;
  }, [items]);

  async function saveCi(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        name: form.name,
        ciType: form.ciType,
        status: form.status,
        healthScore: Number(form.healthScore),
        complianceScore: Number(form.complianceScore),
        riskScore: Number(form.riskScore),
        externalId: form.externalId || undefined,
      };
      if (editing) {
        await apiClient(`/cmdb/cis/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setMessage(`Updated ${form.name}`);
      } else {
        await apiClient('/cmdb/cis', { method: 'POST', body: JSON.stringify(body) });
        setMessage(`Created ${form.name}`);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function deleteCi(id: string, name: string) {
    if (!confirm(`Delete CI "${name}" and its relationships?`)) return;
    await apiClient(`/cmdb/cis/${id}`, { method: 'DELETE' });
    setMessage(`Deleted ${name}`);
    await load();
  }

  async function createRelationship(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiClient('/cmdb/relationships', { method: 'POST', body: JSON.stringify(relForm) });
      setMessage('Relationship created');
      setRelForm({ sourceCiId: '', targetCiId: '', relationshipType: 'depends_on', strength: 'normal' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Relationship failed');
    }
  }

  async function deleteRelationship(id: string) {
    await apiClient(`/cmdb/relationships/${id}`, { method: 'DELETE' });
    await load();
  }

  async function exportData(format: 'json' | 'csv') {
    const token = getAuthTokenFromDocument();
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiUrl()}/api/v1/cmdb/export?format=${format}`, { headers });
    if (!res.ok) {
      setMessage(`Export failed (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'csv' ? 'cmdb-export.csv' : 'cmdb-export.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported as ${format.toUpperCase()}`);
  }

  async function importData() {
    try {
      let itemsPayload: unknown;
      try {
        itemsPayload = JSON.parse(importText);
      } catch {
        // CSV: name,ciType,status,healthScore,...
        const lines = importText.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV needs header + rows');
        const headers = lines[0].split(',').map((h) => h.trim());
        itemsPayload = lines.slice(1).map((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            row[h] = cols[i];
          });
          return {
            name: row.name ?? row.Name,
            ciType: row.ciType ?? row.type ?? 'server',
            status: row.status ?? 'discovered',
            healthScore: Number(row.healthScore ?? 100),
            complianceScore: Number(row.complianceScore ?? 100),
            riskScore: Number(row.riskScore ?? 0),
            externalId: row.externalId || undefined,
          };
        });
      }
      const body = Array.isArray(itemsPayload) ? { items: itemsPayload } : itemsPayload;
      const result = await apiClient<{ imported: number; errors: string[] }>('/cmdb/import', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setMessage(`Imported ${result.imported} item(s)${result.errors.length ? ` · ${result.errors.length} error(s)` : ''}`);
      setImportText('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed');
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(ci: Ci) {
    setEditing(ci);
    setForm({
      name: ci.name,
      ciType: ci.ciType,
      status: ci.status,
      healthScore: ci.healthScore,
      complianceScore: ci.complianceScore,
      riskScore: ci.riskScore,
      externalId: ci.externalId ?? '',
    });
    setShowForm(true);
  }

  const tabs: { id: Tab; label: string; icon: typeof Database }[] = [
    { id: 'items', label: 'Configuration Items', icon: Database },
    { id: 'relationships', label: 'Relationships', icon: Link2 },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'io', label: 'Import / Export', icon: Download },
  ];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">CMDB Explorer</h1>
          <p className="text-sm text-slate-400">Configuration items, relationships, and inventory stats</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            <Plus size={16} /> Add CI
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm text-slate-300">
          {message}
          <button type="button" className="ml-3 text-slate-500 hover:text-white" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total CIs', value: stats.totalAssets },
            { label: 'Active', value: stats.activeAssets },
            { label: 'At risk', value: stats.atRiskAssets },
            { label: 'Avg health', value: stats.avgHealth },
            { label: 'Relationships', value: stats.relationships },
            { label: 'Open alerts', value: stats.openAlerts },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className="mt-1 text-xl font-semibold">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition',
              tab === id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
              <Search size={14} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search CIs…"
                className="bg-transparent outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              {CI_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Compliance</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">AI</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ci) => (
                  <tr key={ci.id} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">{ci.name}</td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-700 px-2 py-0.5 text-xs">{ci.ciType}</span></td>
                    <td className={`px-4 py-3 font-medium ${healthColor(ci.healthScore)}`}>{ci.healthScore}</td>
                    <td className="px-4 py-3">{ci.complianceScore}</td>
                    <td className="px-4 py-3">{ci.riskScore}</td>
                    <td className="px-4 py-3">{ci.aiConfidenceScore}%</td>
                    <td className="px-4 py-3 capitalize text-slate-400">{ci.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(ci)} className="mr-2 text-slate-400 hover:text-white"><Pencil size={14} /></button>
                      <button type="button" onClick={() => deleteCi(ci.id, ci.name)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No configuration items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'relationships' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={createRelationship} className="rounded-xl border border-slate-700 bg-surface-elevated p-4 space-y-3 lg:col-span-1">
            <h3 className="font-medium">Add relationship</h3>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Source CI</label>
              <select required value={relForm.sourceCiId} onChange={(e) => setRelForm({ ...relForm, sourceCiId: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="">Select…</option>
                {items.map((ci) => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Target CI</label>
              <select required value={relForm.targetCiId} onChange={(e) => setRelForm({ ...relForm, targetCiId: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="">Select…</option>
                {items.map((ci) => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Type</label>
              <select value={relForm.relationshipType} onChange={(e) => setRelForm({ ...relForm, relationshipType: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                {REL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Strength</label>
              <select value={relForm.strength} onChange={(e) => setRelForm({ ...relForm, strength: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="weak">weak</option>
                <option value="normal">normal</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <button type="submit" className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white">Create</button>
          </form>

          <div className="lg:col-span-2 space-y-2">
            {relationships.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">{nameById.get(r.sourceCiId) ?? r.sourceCiId.slice(0, 8)}</span>
                  <span className="mx-2 text-primary">{r.relationshipType}</span>
                  <span className="font-medium">{nameById.get(r.targetCiId) ?? r.targetCiId.slice(0, 8)}</span>
                  <span className="ml-2 text-xs text-slate-500">({r.strength})</span>
                </div>
                <button type="button" onClick={() => deleteRelationship(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
            ))}
            {relationships.length === 0 && !loading && (
              <p className="text-slate-500">No relationships yet</p>
            )}
          </div>
        </div>
      )}

      {tab === 'stats' && stats && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
            <h3 className="mb-4 font-medium">By type</h3>
            <div className="space-y-2">
              {stats.byType.map((row) => (
                <div key={row.type} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{row.type}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
              {stats.byType.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
            <h3 className="mb-4 font-medium">By status</h3>
            <div className="space-y-2">
              {stats.byStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-400">{row.status}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
              {stats.byStatus.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'io' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
            <h3 className="mb-3 font-medium">Export</h3>
            <p className="mb-4 text-sm text-slate-400">Download the full CMDB inventory.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => exportData('json')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white">
                <Download size={16} /> JSON
              </button>
              <button type="button" onClick={() => exportData('csv')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">
                <Download size={16} /> CSV
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5">
            <h3 className="mb-3 font-medium">Import</h3>
            <p className="mb-3 text-sm text-slate-400">Paste JSON array or CSV with headers: name,ciType,status,healthScore…</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              className="mb-3 w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 font-mono text-xs"
              placeholder='[{"name":"api-gateway","ciType":"service","status":"active"}]'
            />
            <button type="button" onClick={importData} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white">
              <Upload size={16} /> Import
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={saveCi} className="w-full max-w-lg rounded-xl border border-slate-700 bg-surface-elevated p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Edit CI' : 'Create CI'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Type</label>
                  <select value={form.ciType} onChange={(e) => setForm({ ...form, ciType: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                    {CI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                    {CI_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">External ID</label>
                <input value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Health</label>
                  <input type="number" min={0} max={100} value={form.healthScore} onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Compliance</label>
                  <input type="number" min={0} max={100} value={form.complianceScore} onChange={(e) => setForm({ ...form, complianceScore: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Risk</label>
                  <input type="number" min={0} max={100} value={form.riskScore} onChange={(e) => setForm({ ...form, riskScore: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-600 py-2 text-sm">Cancel</button>
              <button type="submit" className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
