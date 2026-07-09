'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export type WizardProtocol = 'kubernetes' | 'aws' | 'snmp';

interface WizardProps {
  protocol: WizardProtocol;
  onClose: () => void;
  onSubmit: (data: { name: string; protocol: string; config: Record<string, unknown> }) => Promise<void>;
}

const TITLES: Record<WizardProtocol, string> = {
  kubernetes: 'Kubernetes Connector',
  aws: 'AWS Connector',
  snmp: 'SNMP Network Connector',
};

export function ConnectorWizard({ protocol, onClose, onSubmit }: WizardProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [clusterName, setClusterName] = useState('k8s-prod');
  const [namespace, setNamespace] = useState('production');

  const [region, setRegion] = useState('ap-south-1');
  const [accountId, setAccountId] = useState('');

  const [snmpVersion, setSnmpVersion] = useState('v2c');
  const [community, setCommunity] = useState('public');
  const [targets, setTargets] = useState('10.0.1.1,10.0.1.2');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let config: Record<string, unknown> = {};
      if (protocol === 'kubernetes') {
        config = { clusterName, namespace };
      } else if (protocol === 'aws') {
        config = { region, accountId };
      } else {
        config = { version: snmpVersion, community, targets: targets.split(',').map((t) => t.trim()) };
      }
      await onSubmit({ name, protocol, config });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connector');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-surface-elevated p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{TITLES[protocol]}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <label className="mb-1 block text-sm text-slate-400">Connector name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm"
              placeholder={`e.g. ${TITLES[protocol]}`}
            />
          </div>

          {protocol === 'kubernetes' && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Cluster name</label>
                <input value={clusterName} onChange={(e) => setClusterName(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Namespace</label>
                <input value={namespace} onChange={(e) => setNamespace(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {protocol === 'aws' && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">AWS region</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Account ID</label>
                <input value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" placeholder="123456789012" />
              </div>
            </>
          )}

          {protocol === 'snmp' && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">SNMP version</label>
                <select value={snmpVersion} onChange={(e) => setSnmpVersion(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                  <option value="v2c">v2c</option>
                  <option value="v3">v3</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Community string</label>
                <input value={community} onChange={(e) => setCommunity(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Target IPs (comma-separated)</label>
                <input value={targets} onChange={(e) => setTargets(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-600 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-60">
              {loading ? 'Creating…' : 'Create connector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
