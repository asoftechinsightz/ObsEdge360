// @ts-nocheck — R3F intrinsic elements; typechecked when three packages are installed
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';

const LAYERS = [
  { id: 'suite', label: 'Asoftech Business Suite', color: '#0e7c72', w: 2.7 },
  { id: 'lead', label: 'LeadEdge360', color: '#1b4f8a', w: 2.45 },
  { id: 'retail', label: 'RetailEdge360', color: '#2a6bb3', w: 2.45 },
  { id: 'ops', label: 'OpsEdge360', color: '#0e7c72', w: 2.45 },
  { id: 'ai', label: 'AI Agents', color: '#14a396', w: 2.2 },
  { id: 'cloud', label: 'Cloud Infrastructure', color: '#243447', w: 2.55 },
  { id: 'cust', label: 'Customer Systems', color: '#132338', w: 2.35 },
];

function FlowDot({
  from,
  to,
  speed,
  offset,
}: {
  from: [number, number, number];
  to: [number, number, number];
  speed: number;
  offset: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * speed + offset) % 1 + 1) % 1;
    ref.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshBasicMaterial color="#14a396" transparent opacity={0.8} />
    </mesh>
  );
}

function ArchitectureScene() {
  const group = useRef<Group>(null);
  const positions = useMemo(
    () => LAYERS.map((_, i) => [0, 2.4 - i * 0.75, 0] as [number, number, number]),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.12;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.75} />

      {LAYERS.map((layer, i) => {
        const pos = positions[i];
        const next = positions[i + 1];
        return (
          <group key={layer.id}>
            <mesh position={pos}>
              <boxGeometry args={[layer.w, 0.38, 0.7]} />
              <meshStandardMaterial
                color={layer.color}
                roughness={0.35}
                metalness={0.22}
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* emissive edge strip = readable “label band” without font atlas */}
            <mesh position={[0, pos[1], 0.37]}>
              <boxGeometry args={[layer.w * 0.92, 0.08, 0.02]} />
              <meshBasicMaterial color="#e8eef5" transparent opacity={0.35} />
            </mesh>
            {next ? (
              <>
                <mesh position={[0, (pos[1] + next[1]) / 2, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, Math.abs(pos[1] - next[1]) * 0.85, 8]} />
                  <meshBasicMaterial color="#8fa0b3" transparent opacity={0.35} />
                </mesh>
                <FlowDot from={[0, pos[1] - 0.25, 0]} to={[0, next[1] + 0.25, 0]} speed={0.4} offset={i * 0.14} />
                <FlowDot
                  from={[-0.35, pos[1] - 0.25, 0.1]}
                  to={[-0.35, next[1] + 0.25, 0.1]}
                  speed={0.32}
                  offset={0.4 + i * 0.1}
                />
              </>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

export function ArchitectureFlowCanvas({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`} aria-hidden>
      <Canvas
        dpr={[1, 1.4]}
        camera={{ position: [0, 0.2, 8.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ArchitectureScene />
      </Canvas>
      <ol className="pointer-events-none absolute inset-y-3 right-3 flex w-[42%] flex-col justify-between text-[10px] leading-tight text-paper/70 sm:text-[11px]">
        {LAYERS.map((l) => (
          <li key={l.id} className="rounded bg-ink/50 px-2 py-1 backdrop-blur-sm">
            {l.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
