'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { SITE } from '@/lib/site';
import { usePreferLightweightVisuals, usePrefersReducedMotion } from '@/lib/visual-prefs';

type Node = { id: string; label: string; x: number; y: number; r: number; primary?: boolean };

const NODES: Node[] = [
  { id: 'core', label: 'Command', x: 200, y: 168, r: 34, primary: true },
  { id: 'cloud', label: 'Cloud', x: 200, y: 52, r: 20 },
  { id: 'ops', label: 'OpsEdge', x: 62, y: 118, r: 22 },
  { id: 'lead', label: 'LeadEdge', x: 338, y: 118, r: 22 },
  { id: 'retail', label: 'RetailEdge', x: 74, y: 255, r: 20 },
  { id: 'ai', label: 'AI Agents', x: 326, y: 255, r: 20 },
  { id: 'dash', label: 'Observability', x: 200, y: 298, r: 18 },
];

const LINKS: [string, string][] = [
  ['core', 'cloud'],
  ['core', 'ops'],
  ['core', 'lead'],
  ['core', 'retail'],
  ['core', 'ai'],
  ['core', 'dash'],
  ['ops', 'dash'],
  ['ai', 'cloud'],
];

/** Premium SVG Command Center — mutates DOM (no per-frame React state). */
export function CommandCenter2D({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState('core');
  const ringA = useRef<SVGEllipseElement>(null);
  const ringB = useRef<SVGEllipseElement>(null);
  const pulses = useRef<(SVGCircleElement | null)[]>([]);
  const pos = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);
  const activeLabel = NODES.find((n) => n.id === active)?.label ?? 'Command';

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (ringA.current) ringA.current.setAttribute('transform', `rotate(${(t * 4) % 360} 200 168)`);
      if (ringB.current) ringB.current.setAttribute('transform', `rotate(${(-t * 3) % 360} 200 168)`);
      LINKS.forEach(([a, b], i) => {
        const el = pulses.current[i];
        if (!el) return;
        const A = pos[a];
        const B = pos[b];
        const pulse = ((t * 0.28 + i * 0.11) % 1 + 1) % 1;
        el.setAttribute('cx', String(A.x + (B.x - A.x) * pulse));
        el.setAttribute('cy', String(A.y + (B.y - A.y) * pulse));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, pos]);

  return (
    <div className={clsx('relative h-full w-full', className)}>
      <svg
        viewBox="0 0 400 360"
        className="h-full w-full"
        role="img"
        aria-label={`${SITE.name} Enterprise Operations Command Center — ${activeLabel} selected`}
      >
        <defs>
          <radialGradient id="cc-wash" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#0d6e66" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0d6e66" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="168" r="128" fill="url(#cc-wash)" />
        <ellipse
          ref={ringA}
          cx="200"
          cy="168"
          rx="148"
          ry="72"
          fill="none"
          stroke="#8b9aab"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <ellipse
          ref={ringB}
          cx="200"
          cy="168"
          rx="112"
          ry="122"
          fill="none"
          stroke="#8b9aab"
          strokeOpacity="0.12"
          strokeWidth="1"
        />

        {LINKS.map(([a, b], i) => {
          const A = pos[a];
          const B = pos[b];
          const hot = active === a || active === b;
          return (
            <g key={`${a}-${b}`}>
              <line
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={hot ? '#1a9a8f' : '#6b7c8f'}
                strokeWidth={hot ? 1.6 : 1}
                strokeOpacity={hot ? 0.55 : 0.28}
              />
              {!reduce && (
                <circle
                  ref={(el) => {
                    pulses.current[i] = el;
                  }}
                  cx={A.x}
                  cy={A.y}
                  r="2.4"
                  fill="#1a9a8f"
                  opacity="0.7"
                />
              )}
            </g>
          );
        })}

        <g transform="translate(272 44)" opacity="0.75">
          <rect width="84" height="48" rx="5" fill="#0c1520" stroke="#e6edf4" strokeOpacity="0.1" />
          <rect x="8" y="10" width="20" height="26" rx="2" fill="#0d6e66" opacity="0.4" />
          <rect x="32" y="10" width="20" height="26" rx="2" fill="#1a456e" opacity="0.35" />
          <rect x="56" y="10" width="20" height="26" rx="2" fill="#0d6e66" opacity="0.28" />
        </g>

        {NODES.map((n) => {
          const on = active === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setActive(n.id)}
              onFocus={() => setActive(n.id)}
              tabIndex={0}
              role="button"
              aria-pressed={on}
              aria-label={n.label}
            >
              <circle
                r={n.r + (on ? 1.5 : 0)}
                fill={on ? '#0d6e66' : n.primary ? '#1a456e' : '#152030'}
                stroke="#e6edf4"
                strokeOpacity="0.22"
                strokeWidth="1"
              />
              <text
                textAnchor="middle"
                dy="0.35em"
                fill="#ffffff"
                style={{ fontSize: n.primary ? 9 : 7.2, fontWeight: 600 }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="sr-only">Active node: {activeLabel}</p>
    </div>
  );
}

export function ArchitectureStack2D({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const pulses = useRef<(SVGCircleElement | null)[]>([]);
  const layers = [
    'Asoftech Business Suite',
    'LeadEdge360',
    'RetailEdge360',
    'OpsEdge360',
    'AI Agents',
    'Cloud Infrastructure',
    'Customer Systems',
  ];

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      layers.forEach((_, i) => {
        if (i >= layers.length - 1) return;
        const el = pulses.current[i];
        if (!el) return;
        const y = 28 + i * 54;
        const pulse = ((t * 0.35 + i * 0.14) % 1 + 1) % 1;
        el.setAttribute('cy', String(y + 40 + pulse * 14));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div className={clsx('relative h-full w-full', className)}>
      <svg viewBox="0 0 400 420" className="h-full w-full" role="img" aria-label="Platform architecture data flow">
        {layers.map((label, i) => {
          const y = 28 + i * 54;
          return (
            <g key={label}>
              <rect
                x="48"
                y={y}
                width="304"
                height="40"
                rx="6"
                fill={i === 0 ? '#0d6e66' : i < 4 ? '#1a456e' : '#152030'}
                fillOpacity="0.88"
                stroke="#e6edf4"
                strokeOpacity="0.1"
              />
              <text x="200" y={y + 25} textAnchor="middle" fill="#e6edf4" style={{ fontSize: 12, fontWeight: 600 }}>
                {label}
              </text>
              {i < layers.length - 1 && (
                <>
                  <line x1="200" y1={y + 40} x2="200" y2={y + 54} stroke="#8b9aab" strokeOpacity="0.35" />
                  {!reduce && (
                    <circle
                      ref={(el) => {
                        pulses.current[i] = el;
                      }}
                      cx="200"
                      cy={y + 40}
                      r="2.5"
                      fill="#1a9a8f"
                      opacity="0.75"
                    />
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function NetworkField2D({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = usePrefersReducedMotion();
  const light = usePreferLightweightVisuals();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let running = false;
    const nodes = Array.from({ length: light ? 12 : 22 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      pulse: i % 6 === 0,
    }));

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth || 800;
      h = parent?.clientHeight || 600;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < 100) {
            ctx.strokeStyle = `rgba(107,124,143,${0.1 * (1 - d / 100)})`;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.pulse ? 'rgba(26,154,143,0.35)' : 'rgba(107,124,143,0.3)';
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, n.pulse ? 1.8 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { rootMargin: '80px' },
    );
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [reduce, light]);

  if (reduce) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(13,110,102,0.08), transparent 42%), radial-gradient(circle at 80% 60%, rgba(26,69,110,0.07), transparent 45%)',
        }}
      />
    );
  }

  return <canvas ref={canvasRef} className={clsx('h-full w-full', className)} aria-hidden />;
}
