/**
 * Deterministic force-directed / layered layout for topology graphs.
 * No external layout library — production-safe pure TypeScript.
 */

export interface LayoutNode {
  id: string;
  layer?: string;
  x?: number;
  y?: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export type LayoutAlgorithm = 'force-directed' | 'layered' | 'circular' | 'grid';

export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  algorithm: LayoutAlgorithm = 'force-directed',
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();
  if (algorithm === 'circular') return circularLayout(nodes);
  if (algorithm === 'grid') return gridLayout(nodes);
  if (algorithm === 'layered') return layeredLayout(nodes, edges);
  return forceDirectedLayout(nodes, edges);
}

function circularLayout(nodes: LayoutNode[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const n = nodes.length;
  const r = Math.max(180, n * 18);
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    out.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  });
  return out;
}

function gridLayout(nodes: LayoutNode[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const gap = 140;
  nodes.forEach((node, i) => {
    out.set(node.id, {
      x: (i % cols) * gap - ((cols - 1) * gap) / 2,
      y: Math.floor(i / cols) * gap - ((Math.ceil(nodes.length / cols) - 1) * gap) / 2,
    });
  });
  return out;
}

function layeredLayout(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, { x: number; y: number }> {
  const layerOrder = ['business', 'application', 'service', 'k8s', 'infrastructure', 'cloud', 'network'];
  const byLayer = new Map<string, LayoutNode[]>();
  for (const n of nodes) {
    const layer = n.layer ?? inferLayerFromId(n.id, edges);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(n);
  }
  const orderedLayers = [
    ...layerOrder.filter((l) => byLayer.has(l)),
    ...[...byLayer.keys()].filter((l) => !layerOrder.includes(l)),
  ];
  const out = new Map<string, { x: number; y: number }>();
  const rowGap = 160;
  orderedLayers.forEach((layer, row) => {
    const rowNodes = byLayer.get(layer)!;
    const colGap = 140;
    rowNodes.forEach((node, col) => {
      out.set(node.id, {
        x: col * colGap - ((rowNodes.length - 1) * colGap) / 2,
        y: row * rowGap - ((orderedLayers.length - 1) * rowGap) / 2,
      });
    });
  });
  return out;
}

function inferLayerFromId(_id: string, _edges: LayoutEdge[]): string {
  return 'application';
}

function forceDirectedLayout(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const vel = new Map<string, { x: number; y: number }>();
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const r = 80 + n * 4;
    pos.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    vel.set(node.id, { x: 0, y: 0 });
  });

  const iterations = Math.min(120, 40 + n);
  const k = Math.sqrt((800 * 600) / Math.max(n, 1));
  const attraction = 0.08;
  const repulsion = 0.35;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    for (const node of nodes) forces.set(node.id, { x: 0, y: 0 });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pa = pos.get(a.id)!;
        const pb = pos.get(b.id)!;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / dist;
        dx = (dx / dist) * force * repulsion;
        dy = (dy / dist) * force * repulsion;
        forces.get(a.id)!.x += dx;
        forces.get(a.id)!.y += dy;
        forces.get(b.id)!.x -= dx;
        forces.get(b.id)!.y -= dy;
      }
    }

    for (const e of edges) {
      if (!pos.has(e.source) || !pos.has(e.target)) continue;
      const pa = pos.get(e.source)!;
      const pb = pos.get(e.target)!;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;
      dx = (dx / dist) * force * attraction;
      dy = (dy / dist) * force * attraction;
      forces.get(e.source)!.x += dx;
      forces.get(e.source)!.y += dy;
      forces.get(e.target)!.x -= dx;
      forces.get(e.target)!.y -= dy;
    }

    for (const node of nodes) {
      const f = forces.get(node.id)!;
      const v = vel.get(node.id)!;
      const p = pos.get(node.id)!;
      v.x = (v.x + f.x) * damping;
      v.y = (v.y + f.y) * damping;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      const maxSpeed = 40;
      if (speed > maxSpeed) {
        v.x = (v.x / speed) * maxSpeed;
        v.y = (v.y / speed) * maxSpeed;
      }
      p.x += v.x;
      p.y += v.y;
    }
  }

  return pos;
}

export function ciTypeToLayer(ciType: string): string {
  switch (ciType) {
    case 'business_service':
      return 'business';
    case 'application':
    case 'api':
      return 'application';
    case 'service':
    case 'database':
    case 'middleware':
    case 'queue':
    case 'cache':
      return 'service';
    case 'k8s_object':
    case 'pod':
    case 'container':
      return 'k8s';
    case 'server':
    case 'vm':
    case 'cluster':
    case 'storage':
      return 'infrastructure';
    case 'cloud_resource':
      return 'cloud';
    case 'network_device':
    case 'firewall':
    case 'load_balancer':
      return 'network';
    default:
      return 'application';
  }
}
