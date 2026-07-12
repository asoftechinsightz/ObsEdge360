'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type Props = {
  /** Short context for the model, e.g. incident title */
  context: string;
  /** Preset prompt when user clicks Explain */
  prompt: string;
  title?: string;
  className?: string;
};

/**
 * Inline AI assist — uses existing /copilot/chat (no new backend).
 * APEX Workstream 2: AI in workflow, not a separate page.
 */
export function InlineAiAssist({ context, prompt, title = 'AI insight', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [err, setErr] = useState('');

  async function run() {
    setOpen(true);
    setLoading(true);
    setErr('');
    try {
      const result = await apiClient<{
        reply: string;
        recommendations?: Array<{ confidence?: number }>;
      }>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nContext:\n${context}\n\nRespond as an enterprise operations advisor. Lead with business impact, then recommended action, then brief technical rationale. State confidence.`,
            },
          ],
        }),
      });
      setReply(result.reply || 'No insight returned.');
      const c = result.recommendations?.[0]?.confidence;
      setConfidence(typeof c === 'number' ? (c <= 1 ? c * 100 : c) : 72);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI assist unavailable');
      setReply('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-[var(--eig-radius-sm)] border border-sky-500/20 bg-sky-500/5 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => (open && reply ? setOpen((v) => !v) : run())}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:text-sky-200"
        >
          <Sparkles size={14} aria-hidden />
          {title}
          {open && <ChevronDown size={12} className={open ? 'rotate-180' : ''} aria-hidden />}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run()}
          className="rounded px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Explain'}
        </button>
      </div>
      {open && (
        <div className="border-t border-sky-500/10 px-3 py-2 text-xs text-slate-300">
          {loading && <p className="text-slate-500">Generating insight…</p>}
          {err && <p className="text-amber-200">{err}</p>}
          {reply && (
            <>
              <p className="whitespace-pre-wrap leading-relaxed">{reply}</p>
              {confidence != null && (
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                  AI confidence ~{Math.round(confidence)}% · verify before acting
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
