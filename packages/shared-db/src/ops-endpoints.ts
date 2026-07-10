/**
 * Standard ops endpoints for Express-compatible apps (Phase 1 rule).
 * Mounts: /health, /ready, /live, /version, /metrics
 * Avoids hard dependency on express types in shared-db.
 */

export interface OpsHttpResponse {
  status: (code: number) => OpsHttpResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
}

export interface OpsHttpRequest {
  // intentionally minimal
}

export type OpsRouteHandler = (req: OpsHttpRequest, res: OpsHttpResponse) => void | Promise<void>;

export interface OpsApp {
  get: (path: string, handler: OpsRouteHandler) => unknown;
}

export interface OpsEndpointOptions {
  service: string;
  version?: string;
  readyCheck?: () => Promise<boolean> | boolean;
  /** When false, skips /health (use when service already defines a richer health handler). Default true. */
  includeHealth?: boolean;
}

export function mountOpsEndpoints(app: OpsApp, options: OpsEndpointOptions): void {
  const version = options.version ?? process.env.SERVICE_VERSION ?? '1.0.0';
  const includeHealth = options.includeHealth !== false;

  if (includeHealth) {
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        service: options.service,
        version,
        timestamp: new Date().toISOString(),
      });
    });
  }

  app.get('/ready', async (_req, res) => {
    try {
      const ok = options.readyCheck ? await options.readyCheck() : true;
      if (!ok) {
        res.status(503).json({ status: 'not_ready', service: options.service, version });
        return;
      }
      res.json({ status: 'ready', service: options.service, version });
    } catch (err) {
      res.status(503).json({
        status: 'not_ready',
        service: options.service,
        version,
        error: (err as Error).message,
      });
    }
  });

  app.get('/live', (_req, res) => {
    res.json({ status: 'live', service: options.service, version });
  });

  app.get('/version', (_req, res) => {
    res.json({
      service: options.service,
      version,
      node: process.version,
      platform: 'OpsEdge360',
    });
  });

  app.get('/metrics', (_req, res) => {
    const mem = process.memoryUsage();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(
      [
        `# HELP process_resident_memory_bytes Resident memory size in bytes.`,
        `# TYPE process_resident_memory_bytes gauge`,
        `process_resident_memory_bytes{service="${options.service}"} ${mem.rss}`,
        `# HELP process_uptime_seconds Process uptime in seconds.`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds{service="${options.service}"} ${process.uptime()}`,
        `# HELP service_up Service availability.`,
        `# TYPE service_up gauge`,
        `service_up{service="${options.service}"} 1`,
        '',
      ].join('\n'),
    );
  });
}
