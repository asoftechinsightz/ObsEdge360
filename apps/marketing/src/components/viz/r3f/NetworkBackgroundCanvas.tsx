// @ts-nocheck — R3F intrinsic elements; typechecked when three packages are installed
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';

type Node = { x: number; y: number; z: number };

function NetworkScene({ density = 26 }: { density?: number }) {
  const group = useRef<Group>(null);
  const nodes = useMemo<Node[]>(() => {
    const list: Node[] = [];
    for (let i = 0; i < density; i++) {
      const a = (i / density) * Math.PI * 2;
      const r = 1.5 + (i % 5) * 0.32;
      list.push({
        x: Math.cos(a) * r * (0.75 + (i % 3) * 0.12),
        y: Math.sin(a * 1.25) * 0.85,
        z: Math.sin(a) * r * 0.5 - 1.1,
      });
    }
    return list;
  }, [density]);

  const segments = useMemo(() => {
    const pts: [number, number, number][][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.3) {
          pts.push([
            [nodes[i].x, nodes[i].y, nodes[i].z],
            [nodes[j].x, nodes[j].y, nodes[j].z],
          ]);
        }
      }
    }
    return pts.slice(0, 42);
  }, [nodes]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.035;
    group.current.rotation.x = Math.sin(t * 0.04) * 0.04;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.4} />
      <mesh position={[0, 0, -1]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#0e7c72" transparent opacity={0.28} />
      </mesh>
      {nodes.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, n.z]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshBasicMaterial color={i % 5 === 0 ? '#14a396' : '#8fa0b3'} transparent opacity={0.5} />
        </mesh>
      ))}
      {segments.map((seg, i) => (
        <Line key={i} points={seg} color="#5c6b7a" lineWidth={1} transparent opacity={0.22} />
      ))}
    </group>
  );
}

export function NetworkBackgroundCanvas({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <NetworkScene />
      </Canvas>
    </div>
  );
}
