'use client';

import clsx from 'clsx';
import { ArchitectureStack2D, CommandCenter2D, NetworkField2D } from './Immersive2D';

/**
 * Immersive visuals gate.
 *
 * Production path: premium SVG / Canvas2D (mobile + desktop).
 * React Three Fiber scenes under `./r3f/*` remain optional after local TLS
 * is fixed — wire only as enhancement, do not replace this path.
 */
export function HeroCommandVisual({ className }: { className?: string }) {
  return <CommandCenter2D className={className} />;
}

export function ArchitectureFlowVisual({ className }: { className?: string }) {
  return <ArchitectureStack2D className={className} />;
}

export function EnterpriseNetworkBackdrop({ className }: { className?: string }) {
  return <NetworkField2D className={clsx('pointer-events-none absolute inset-0 opacity-50', className)} />;
}
