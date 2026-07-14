// @ts-nocheck — R3F intrinsic elements; typechecked when three packages are installed
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';

const TEAL = '#0e7c72';
const COBALT = '#1b4f8a';
const PAPER = '#e8eef5';

function SoftNode({
  position,
  color,
  scale = 1,
  label,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  label?: string;
}) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.scale.setScalar(scale * (1 + Math.sin(t * 1.2 + position[0]) * 0.03));
  });
  return (
    <Float speed={1.1} rotationIntensity={0.15} floatIntensity={0.35}>
      <mesh ref={mesh} position={position}>
        <icosahedronGeometry args={[0.28 * scale, 1]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} transparent opacity={0.92} />
      </mesh>
      {label ? null : null}
    </Float>
  );
}

function DataPulse({
  a,
  b,
  delay = 0,
}: {
  a: [number, number, number];
  b: [number, number, number];
  delay?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * 0.35 + delay) % 1 + 1) % 1;
    ref.current.position.set(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 12, 12]} />
      <meshBasicMaterial color={TEAL} transparent opacity={0.85} />
    </mesh>
  );
}

function DashboardPlane({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={0.8} floatIntensity={0.2} rotationIntensity={0.08}>
      <group position={position} rotation={[0.15, -0.35, 0.05]}>
        <mesh>
          <planeGeometry args={[1.6, 1]} />
          <meshStandardMaterial color="#0f1c2e" roughness={0.4} metalness={0.3} transparent opacity={0.9} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.45 + i * 0.45, 0.15, 0.02]}>
            <planeGeometry args={[0.32, 0.35]} />
            <meshBasicMaterial color={i === 1 ? TEAL : COBALT} transparent opacity={0.45} />
          </mesh>
        ))}
        <mesh position={[0, -0.28, 0.02]}>
          <planeGeometry args={[1.2, 0.12]} />
          <meshBasicMaterial color={PAPER} transparent opacity={0.12} />
        </mesh>
      </group>
    </Float>
  );
}

function CommandScene() {
  const root = useRef<Group>(null);
  const nodes = useMemo(
    () =>
      [
        { p: [0, 0.2, 0] as [number, number, number], c: TEAL, s: 1.35 },
        { p: [-1.6, 0.6, -0.4] as [number, number, number], c: COBALT, s: 0.9 },
        { p: [1.5, 0.5, -0.3] as [number, number, number], c: COBALT, s: 0.9 },
        { p: [-1.1, -0.7, 0.5] as [number, number, number], c: TEAL, s: 0.75 },
        { p: [1.2, -0.8, 0.4] as [number, number, number], c: TEAL, s: 0.75 },
        { p: [0.1, 1.1, -0.8] as [number, number, number], c: PAPER, s: 0.55 },
        { p: [-0.4, -1.15, -0.2] as [number, number, number], c: COBALT, s: 0.55 },
      ] as const,
    [],
  );

  const links = useMemo(
    () =>
      [
        [nodes[0].p, nodes[1].p],
        [nodes[0].p, nodes[2].p],
        [nodes[0].p, nodes[3].p],
        [nodes[0].p, nodes[4].p],
        [nodes[1].p, nodes[5].p],
        [nodes[2].p, nodes[5].p],
        [nodes[3].p, nodes[6].p],
        [nodes[4].p, nodes[6].p],
      ] as [number, number, number][][],
    [nodes],
  );

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    root.current.rotation.y = Math.sin(t * 0.12) * 0.18;
    root.current.rotation.x = Math.sin(t * 0.08) * 0.06;
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={0.85} color="#dff5f2" />
      <pointLight position={[-3, 2, 2]} intensity={0.35} color={TEAL} />

      {links.map((pair, i) => (
        <group key={i}>
          <Line
            points={pair}
            color="#8fa0b3"
            lineWidth={1}
            transparent
            opacity={0.35}
          />
          <DataPulse a={pair[0]} b={pair[1]} delay={i * 0.12} />
        </group>
      ))}

      {nodes.map((n, i) => (
        <SoftNode key={i} position={n.p} color={n.c} scale={n.s} />
      ))}

      <DashboardPlane position={[2.1, 0.15, 0.9]} />

      {/* subtle orbital ring = global network cue */}
      <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
        <torusGeometry args={[2.35, 0.012, 12, 96]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[Math.PI / 3.2, -0.4, 0.3]}>
        <torusGeometry args={[2.7, 0.01, 12, 96]} />
        <meshBasicMaterial color={COBALT} transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

export function CommandCenterCanvas({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <CommandScene />
      </Canvas>
    </div>
  );
}
