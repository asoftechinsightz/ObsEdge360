/**
 * Prometheus / OpenMetrics text exposition parser (subset).
 * https://prometheus.io/docs/instrumenting/exposition_formats/
 */

export interface PromSample {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestampMs?: number;
}

export function parsePrometheusText(text: string): PromSample[] {
  const samples: PromSample[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // metric{label="v"} value [timestamp]
    // metric value
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([^\s]+)(?:\s+(\d+))?$/);
    if (!match) continue;

    const name = match[1];
    const labels = parseLabels(match[2] ?? '');
    const value = Number(match[3]);
    if (!Number.isFinite(value)) continue;
    const ts = match[4] ? Number(match[4]) : undefined;
    // Prometheus timestamps may be ms or seconds; treat large as ms
    const timestampMs = ts == null ? undefined : ts > 1e12 ? ts : ts * 1000;

    samples.push({ name, value, labels, timestampMs });
  }
  return samples;
}

function parseLabels(block: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!block.startsWith('{')) return labels;
  const inner = block.slice(1, -1);
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    labels[m[1]] = m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return labels;
}

export function samplesToJsonTimeseries(samples: PromSample[]) {
  return samples.map((s) => ({
    labels: { __name__: s.name, ...s.labels },
    samples: [{ value: s.value, timestamp: s.timestampMs ?? Date.now() }],
  }));
}
