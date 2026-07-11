'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function SecretValidationPage() {
  const [secretRef, setSecretRef] = useState('');
  const [result, setResult] = useState('');
  async function validate() {
    try {
      const r = await apiClient('/integrations/secrets/validate', {
        method: 'POST',
        body: JSON.stringify({ secretRef }),
      });
      setResult(JSON.stringify(r, null, 2));
    } catch (e) {
      setResult((e as Error).message);
    }
  }
  return (
    <AdminShell title="Secret Validation">
      <p className="mb-3 text-sm text-slate-400">Validate secret references without revealing plaintext values.</p>
      <div className="mb-4 flex gap-2">
        <input className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Secret UUID" value={secretRef} onChange={(e) => setSecretRef(e.target.value)} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={validate}>Validate</button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{result}</pre>
    </AdminShell>
  );
}
