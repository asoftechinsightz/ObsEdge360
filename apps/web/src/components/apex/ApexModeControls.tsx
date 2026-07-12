'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Presentation, Sparkles } from 'lucide-react';
import {
  isPresentationMode,
  setPresentationMode,
  isExecutiveDemoMode,
  setExecutiveDemoMode,
  syncApexDomFlags,
} from '@/lib/apex-mode';

/** Header controls for Presentation + Executive Demo modes (APEX WS9). */
export function ApexModeControls() {
  const [presentation, setPresentation] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    syncApexDomFlags();
    setPresentation(isPresentationMode());
    setDemo(isExecutiveDemoMode());
    const on = () => {
      setPresentation(isPresentationMode());
      setDemo(isExecutiveDemoMode());
    };
    window.addEventListener('opsedge:apex-mode', on);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const next = !isPresentationMode();
        setPresentationMode(next);
        setPresentation(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('opsedge:apex-mode', on);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="hidden items-center gap-1 md:flex">
      <button
        type="button"
        title="Presentation mode (Ctrl+Shift+P)"
        aria-pressed={presentation}
        onClick={() => {
          const next = !presentation;
          setPresentationMode(next);
          setPresentation(next);
          if (!next) {
            setExecutiveDemoMode(false);
            setDemo(false);
          }
        }}
        className={`rounded-[var(--eig-radius-sm)] border px-2 py-1.5 text-xs transition ${
          presentation
            ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
            : 'border-[var(--eig-border)] text-slate-400 hover:text-slate-200'
        }`}
      >
        <Presentation size={14} aria-hidden />
      </button>
      <Link
        href="/demo"
        title="Executive Demo Mode"
        className={`rounded-[var(--eig-radius-sm)] border px-2 py-1.5 text-xs transition ${
          demo
            ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
            : 'border-[var(--eig-border)] text-slate-400 hover:text-slate-200'
        }`}
        onClick={() => {
          setExecutiveDemoMode(true);
          setDemo(true);
        }}
      >
        <Sparkles size={14} aria-hidden />
      </Link>
    </div>
  );
}
