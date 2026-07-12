'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { bump } from '@/lib/cvp/analytics';
import Link from 'next/link';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  actionHref?: string;
  confidence: number;
}

interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Summarize today's critical incidents.",
  'Why is UPI latency increasing?',
  'Show services at highest business risk.',
  "Explain yesterday's outage.",
  'Recommend actions for certificate expiry.',
  'Predict capacity risks.',
];

export function CopilotPanel({ open, onClose }: CopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'I am the OpsEdge360 copilot. Ask about RCA, recommendations, compliance, or payment SLOs.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bump('copilotOpens');
      apiClient<{ recommendations: Recommendation[] }>('/copilot/recommendations')
        .then((d) => setRecs(d.recommendations.slice(0, 4)))
        .catch(() => undefined);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    bump('copilotMessages');

    try {
      const result = await apiClient<{
        reply: string;
        recommendations: Recommendation[];
        structured?: { confirmed?: string[]; correlations?: string[]; recommendations?: string[]; disclaimer?: string };
      }>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: nextMessages }),
      });
      let content = result.reply;
      if (result.structured) {
        const s = result.structured;
        content += `\n\n—\nConfirmed: ${(s.confirmed || []).join('; ') || 'n/a'}\nCorrelations: ${(s.correlations || []).join('; ') || 'n/a'}\nRecommendations: ${(s.recommendations || []).slice(0, 3).join(' | ') || 'n/a'}\n${s.disclaimer || ''}`;
      }
      setMessages((m) => [...m, { role: 'assistant', content }]);
      if (result.recommendations?.length) setRecs(result.recommendations.slice(0, 4));
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Copilot request failed',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runRca() {
    setLoading(true);
    try {
      const result = await apiClient<{ summary: string; recommendations: Recommendation[] }>('/copilot/rca', {
        method: 'POST',
        body: JSON.stringify({ question: 'Run RCA on current platform signals' }),
      });
      setMessages((m) => [...m, { role: 'user', content: 'Run RCA' }, { role: 'assistant', content: result.summary }]);
      setRecs(result.recommendations.slice(0, 4));
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err instanceof Error ? err.message : 'RCA failed' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-700 bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Bot size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Copilot</div>
            <div className="text-[10px] text-slate-500">RCA · recommendations · ops Q&A</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {recs.length > 0 && (
        <div className="border-b border-slate-700 bg-surface-elevated/50 px-4 py-3">
          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-400">
            <Sparkles size={12} /> Recommendations
          </div>
          <div className="space-y-2">
            {recs.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-700 bg-surface px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200">{r.title}</span>
                  <span className={clsx(
                    'rounded px-1.5 py-0.5 uppercase',
                    r.priority === 'critical' || r.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-400',
                  )}>
                    {r.priority}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">{r.description}</p>
                {r.actionHref && (
                  <Link href={r.actionHref} onClick={onClose} className="mt-1 inline-block text-primary hover:underline">
                    Open →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
              m.role === 'user'
                ? 'ml-auto bg-primary text-white'
                : 'bg-surface-elevated text-slate-200 border border-slate-700',
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-700 px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:border-primary/50 hover:text-primary"
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={runRca}
            className="rounded-full border border-orange-500/40 px-2 py-0.5 text-[10px] text-orange-300 hover:bg-orange-500/10"
          >
            Run RCA
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the copilot…"
            className="flex-1 rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-primary p-2 text-white disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
