import { gzipSync, gunzipSync } from 'zlib';

export function compressPayload(data: unknown): { payload: Buffer; compressed: boolean } {
  const json = Buffer.from(JSON.stringify(data), 'utf8');
  if (json.length < 1024) {
    return { payload: json, compressed: false };
  }
  return { payload: gzipSync(json), compressed: true };
}

export function decompressPayload(buffer: Buffer, compressed: boolean): unknown {
  const raw = compressed ? gunzipSync(buffer) : buffer;
  return JSON.parse(raw.toString('utf8'));
}

export function encodeCompressedBody(data: unknown): { body: string; headers: Record<string, string> } {
  const { payload, compressed } = compressPayload(data);
  if (!compressed) {
    return { body: payload.toString('utf8'), headers: { 'Content-Type': 'application/json' } };
  }
  return {
    body: payload.toString('base64'),
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'X-OpsEdge-Compressed': 'true',
    },
  };
}
