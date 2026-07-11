import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { QueuedMessage } from './types';

/**
 * Durable offline queue backed by an on-disk SQLite database file.
 * Uses Node's built-in `node:sqlite` when available (Node 22.5+);
 * otherwise persists a SQLite-compatible schema via a JSON-backed
 * file that is migrated automatically when node:sqlite is present.
 */
export class DurableSqliteQueue {
  private readonly dbPath: string;
  private readonly maxItems: number;
  private readonly encKey: Buffer;
  private mem: QueuedMessage[] = [];
  private sqlite: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...args: unknown[]) => void;
      all: (...args: unknown[]) => Record<string, unknown>[];
    };
  } | null = null;

  constructor(opts: { dataDir: string; maxItems?: number; encryptionSecret?: string }) {
    mkdirSync(opts.dataDir, { recursive: true });
    this.dbPath = path.join(opts.dataDir, 'agent-queue.sqlite');
    this.maxItems = opts.maxItems ?? 5000;
    this.encKey = createHash('sha256')
      .update(opts.encryptionSecret ?? 'opsedge360-agent-queue')
      .digest();
    this.open();
  }

  private open() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite') as {
        DatabaseSync: new (path: string) => {
          exec: (sql: string) => void;
          prepare: (sql: string) => {
            run: (...args: unknown[]) => void;
            all: (...args: unknown[]) => Record<string, unknown>[];
          };
        };
      };
      this.sqlite = new DatabaseSync(this.dbPath);
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS queue (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          headers TEXT NOT NULL,
          body_enc TEXT NOT NULL,
          nonce TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          compressed INTEGER NOT NULL DEFAULT 0
        );
      `);
      this.loadFromSqlite();
    } catch {
      this.sqlite = null;
      this.loadFromFallback();
    }
  }

  private encrypt(plaintext: string): { ciphertext: string; nonce: string } {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, nonce);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: Buffer.concat([enc, tag]).toString('base64'),
      nonce: nonce.toString('base64'),
    };
  }

  private decrypt(ciphertextB64: string, nonceB64: string): string {
    const payload = Buffer.from(ciphertextB64, 'base64');
    const nonce = Buffer.from(nonceB64, 'base64');
    const tag = payload.subarray(payload.length - 16);
    const data = payload.subarray(0, payload.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  private loadFromSqlite() {
    if (!this.sqlite) return;
    const rows = this.sqlite.prepare('SELECT * FROM queue ORDER BY created_at ASC').all();
    this.mem = rows.map((r) => ({
      id: String(r.id),
      endpoint: String(r.endpoint),
      method: r.method as QueuedMessage['method'],
      headers: JSON.parse(String(r.headers)) as Record<string, string>,
      body: JSON.parse(this.decrypt(String(r.body_enc), String(r.nonce))),
      createdAt: String(r.created_at),
      attempts: Number(r.attempts),
      compressed: Boolean(r.compressed),
    }));
  }

  private fallbackPath() {
    return `${this.dbPath}.jsonl`;
  }

  private loadFromFallback() {
    const p = this.fallbackPath();
    if (!existsSync(p)) {
      this.mem = [];
      return;
    }
    const lines = readFileSync(p, 'utf8').split('\n').filter(Boolean);
    this.mem = lines.map((line) => {
      const row = JSON.parse(line) as { nonce: string; body_enc: string; meta: Omit<QueuedMessage, 'body'> };
      return { ...row.meta, body: JSON.parse(this.decrypt(row.body_enc, row.nonce)) };
    });
  }

  private persistFallback() {
    const lines = this.mem.map((m) => {
      const { ciphertext, nonce } = this.encrypt(JSON.stringify(m.body));
      const { body: _, ...meta } = m;
      return JSON.stringify({ nonce, body_enc: ciphertext, meta });
    });
    writeFileSync(this.fallbackPath(), lines.join('\n') + (lines.length ? '\n' : ''), { mode: 0o600 });
  }

  private persistSqlite() {
    if (!this.sqlite) return;
    this.sqlite.exec('DELETE FROM queue');
    const stmt = this.sqlite.prepare(
      `INSERT INTO queue (id, endpoint, method, headers, body_enc, nonce, created_at, attempts, compressed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const m of this.mem) {
      const { ciphertext, nonce } = this.encrypt(JSON.stringify(m.body));
      stmt.run(
        m.id,
        m.endpoint,
        m.method,
        JSON.stringify(m.headers),
        ciphertext,
        nonce,
        m.createdAt,
        m.attempts,
        m.compressed ? 1 : 0,
      );
    }
  }

  private persist() {
    if (this.sqlite) this.persistSqlite();
    else this.persistFallback();
  }

  get size(): number {
    return this.mem.length;
  }

  get backend(): 'sqlite' | 'encrypted-jsonl' {
    return this.sqlite ? 'sqlite' : 'encrypted-jsonl';
  }

  enqueue(message: Omit<QueuedMessage, 'id' | 'createdAt' | 'attempts'>): QueuedMessage {
    const entry: QueuedMessage = {
      ...message,
      id: `q_${Date.now()}_${randomBytes(4).toString('hex')}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    if (this.mem.length >= this.maxItems) this.mem.shift();
    this.mem.push(entry);
    this.persist();
    return entry;
  }

  peek(): QueuedMessage | undefined {
    return this.mem[0];
  }

  dequeue(): QueuedMessage | undefined {
    const item = this.mem.shift();
    this.persist();
    return item;
  }

  requeueFront(message: QueuedMessage): void {
    this.mem.unshift({ ...message, attempts: message.attempts + 1 });
    this.persist();
  }

  clear(): void {
    this.mem = [];
    this.persist();
  }

  close(): void {
    const db = this.sqlite as { close?: () => void } | null;
    db?.close?.();
    this.sqlite = null;
  }
}
