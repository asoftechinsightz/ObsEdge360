'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SITE } from '@/lib/site';

type NodeId = 'suite' | 'ops' | 'lead' | 'retail' | 'ai';

const NODES: { id: NodeId; label: string; x: number; y: number; primary?: boolean }[] = [
  { id: 'suite', label: SITE.suite, x: 200, y: 160, primary: true },
  { id: 'ai', label: 'Shared AI', x: 200, y: 60 },
  { id: 'ops', label: 'OpsEdge360', x: 60, y: 260 },
  { id: 'lead', label: 'LeadEdge360', x: 200, y: 300 },
  { id: 'retail', label: 'RetailEdge360', x: 340, y: 260 },
];

const LINKS: [NodeId, NodeId][] = [
  ['ai', 'suite'],
  ['suite', 'ops'],
  ['suite', 'lead'],
  ['suite', 'retail'],
];

/** Interactive SVG architecture — production-safe without Three.js (R3F optional later). */
export function PlatformVisual({ className }: { className?: string }) {
  const [active, setActive] = useState<NodeId>('suite');
  const pos = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);

  return (
    <div className={clsx('relative h-full w-full', className)}>
      <svg
        viewBox="0 0 400 360"
        className="h-full w-full"
        role="img"
        aria-label={`${SITE.suite} connected to OpsEdge360, LeadEdge360, RetailEdge360, and Shared AI`}
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#0e7c72" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0e7c72" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="160" r="120" fill="url(#glow)" />
        {LINKS.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={pos[a].x}
            y1={pos[a].y}
            x2={pos[b].x}
            y2={pos[b].y}
            stroke={active === a || active === b ? '#14a396' : '#8fa0b3'}
            strokeWidth={active === a || active === b ? 2.5 : 1.25}
            strokeOpacity={0.7}
          />
        ))}
        {NODES.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            className="cursor-pointer"
            onMouseEnter={() => setActive(n.id)}
            onFocus={() => setActive(n.id)}
            tabIndex={0}
            role="button"
            aria-pressed={active === n.id}
            aria-label={n.label}
          >
            <circle
              r={n.primary ? 34 : 26}
              fill={active === n.id ? '#0e7c72' : n.primary ? '#1b4f8a' : '#132338'}
              stroke="#e8eef5"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
            <text
              textAnchor="middle"
              dy="0.35em"
              className="fill-white"
              style={{ fontSize: n.primary ? 9 : 8, fontWeight: 600 }}
            >
              {n.primary ? 'Suite' : n.label.replace('360', '')}
            </text>
          </g>
        ))}
      </svg>
      <p className="sr-only">
        Active: {NODES.find((n) => n.id === active)?.label}
      </p>
    </div>
  );
}
