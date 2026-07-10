import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  service?: string;
  module?: string;
  tenantId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  agentId?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  correlationId: string;
  traceId?: string;
  spanId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

function resolveMinLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw in LEVEL_PRIORITY) return raw as LogLevel;
  return 'info';
}

export class Logger {
  private readonly service: string;
  private readonly baseContext: LogContext;
  private readonly minLevel: LogLevel;

  constructor(service: string, baseContext: LogContext = {}) {
    this.service = service;
    this.baseContext = baseContext;
    this.minLevel = resolveMinLevel();
  }

  child(context: LogContext): Logger {
    return new Logger(this.service, { ...this.baseContext, ...context });
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private emit(level: LogLevel, message: string, context?: LogContext, err?: Error): void {
    if (!this.shouldLog(level)) return;

    const merged = { ...this.baseContext, ...context };
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      correlationId: String(merged.correlationId ?? randomUUID()),
      traceId: merged.traceId as string | undefined,
      spanId: merged.spanId as string | undefined,
    };

    const { correlationId: _c, traceId: _t, spanId: _s, service: _sv, module: _m, ...rest } = merged;
    if (Object.keys(rest).length > 0) entry.context = rest;

    if (err) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, err?: Error, context?: LogContext): void {
    this.emit('error', message, context, err);
  }

  fatal(message: string, err?: Error, context?: LogContext): void {
    this.emit('fatal', message, context, err);
  }
}

const loggers = new Map<string, Logger>();

export function createLogger(service: string, context?: LogContext): Logger {
  const key = `${service}:${JSON.stringify(context ?? {})}`;
  const existing = loggers.get(key);
  if (existing) return existing;
  const logger = new Logger(service, context);
  loggers.set(key, logger);
  return logger;
}

export function getCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-correlation-id'] ?? headers['x-request-id'];
  if (Array.isArray(raw)) return raw[0] ?? randomUUID();
  return raw ?? randomUUID();
}
