import { connect as tlsConnect } from 'tls';
import { Socket } from 'net';

/** Minimal LDAP Simple Bind + Search for enterprise identity (no plaintext storage). */

function encodeLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  if (len < 0x100) return Buffer.from([0x81, len]);
  return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function berSequence(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(content.length), content]);
}

function berInteger(n: number): Buffer {
  if (n < 0x80) return Buffer.concat([Buffer.from([0x02, 0x01, n])]);
  return Buffer.concat([Buffer.from([0x02, 0x02, (n >> 8) & 0xff, n & 0xff])]);
}

function berOctet(str: string): Buffer {
  const b = Buffer.from(str, 'utf8');
  return Buffer.concat([Buffer.from([0x04]), encodeLength(b.length), b]);
}

function berNull(): Buffer {
  return Buffer.from([0x05, 0x00]);
}

function buildBindRequest(messageId: number, dn: string, password: string): Buffer {
  const bind = berSequence(
    0x60,
    Buffer.concat([berInteger(3), berOctet(dn), Buffer.concat([Buffer.from([0x80]), encodeLength(Buffer.byteLength(password)), Buffer.from(password, 'utf8')])]),
  );
  return berSequence(0x30, Buffer.concat([berInteger(messageId), bind]));
}

function buildSearchRequest(messageId: number, baseDn: string, filter: string, sizeLimit = 50): Buffer {
  const filt = filter.startsWith('(') ? filter : `(${filter})`;
  // Equality or present simplified: wrap as octet string under and/or — use substring filter as octet for extensibility
  // Use "(objectClass=*)" style via filter as raw sequence: Filter = context-specific
  // Minimal: equality filter (uid=x) or objectClass=* as present
  let filterBer: Buffer;
  const eq = filt.match(/^\((\w+)=(.+)\)$/);
  if (eq && eq[2] === '*') {
    filterBer = berSequence(0x87, Buffer.from(eq[1], 'utf8')); // present
  } else if (eq) {
    filterBer = berSequence(0xa3, Buffer.concat([berOctet(eq[1]), berOctet(eq[2])])); // equality
  } else {
    filterBer = berSequence(0x87, Buffer.from('objectClass', 'utf8'));
  }
  const search = berSequence(
    0x63,
    Buffer.concat([
      berOctet(baseDn),
      berInteger(2), // wholeSubtree
      berInteger(0), // deref
      berInteger(sizeLimit),
      berInteger(0), // time
      Buffer.from([0x01, 0x01, 0x00]), // typesOnly false
      filterBer,
      berSequence(0x30, Buffer.concat([berOctet('cn'), berOctet('mail'), berOctet('uid'), berOctet('memberOf')])),
    ]),
  );
  return berSequence(0x30, Buffer.concat([berInteger(messageId), search]));
}

function parseBindResult(buf: Buffer): { ok: boolean; code: number } {
  // Heuristic: find ENUMERATED resultCode (0x0a 0x01 XX)
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x0a && buf[i + 1] === 0x01) {
      const code = buf[i + 2];
      return { ok: code === 0, code };
    }
  }
  return { ok: false, code: -1 };
}

async function ldapConnect(host: string, port: number, useTls: boolean, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const onErr = (e: Error) => reject(e);
    if (useTls) {
      const sock = tlsConnect({ host, port, servername: host, rejectUnauthorized: process.env.LDAP_TLS_INSECURE !== 'true' }, () => {
        sock.off('error', onErr);
        resolve(sock);
      });
      sock.setTimeout(timeoutMs);
      sock.on('error', onErr);
      sock.on('timeout', () => {
        sock.destroy();
        reject(new Error('ldap_timeout'));
      });
    } else {
      const sock = new Socket();
      sock.setTimeout(timeoutMs);
      sock.connect(port, host, () => {
        sock.off('error', onErr);
        resolve(sock);
      });
      sock.on('error', onErr);
      sock.on('timeout', () => {
        sock.destroy();
        reject(new Error('ldap_timeout'));
      });
    }
  });
}

async function ldapRoundTrip(sock: Socket, request: Buffer, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('ldap_timeout'));
    }, timeoutMs);
    const onData = (d: Buffer) => {
      chunks.push(d);
      const buf = Buffer.concat(chunks);
      if (buf.length >= 2) {
        clearTimeout(timer);
        cleanup();
        resolve(buf);
      }
    };
    const onErr = (e: Error) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      sock.off('data', onData);
      sock.off('error', onErr);
    };
    sock.on('data', onData);
    sock.on('error', onErr);
    sock.write(request);
  });
}

export async function ldapTestBind(opts: {
  host: string;
  port?: number;
  useTls?: boolean;
  bindDn: string;
  bindPassword: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; latencyMs: number; code?: number; error?: string }> {
  const started = Date.now();
  const port = opts.port ?? (opts.useTls ? 636 : 389);
  let sock: Socket | null = null;
  try {
    sock = await ldapConnect(opts.host, port, !!opts.useTls, opts.timeoutMs ?? 8000);
    const resp = await ldapRoundTrip(sock, buildBindRequest(1, opts.bindDn, opts.bindPassword), opts.timeoutMs ?? 8000);
    const parsed = parseBindResult(resp);
    return { ok: parsed.ok, latencyMs: Date.now() - started, code: parsed.code };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - started, error: (e as Error).message };
  } finally {
    sock?.destroy();
  }
}

export async function ldapSearchUsers(opts: {
  host: string;
  port?: number;
  useTls?: boolean;
  bindDn: string;
  bindPassword: string;
  baseDn: string;
  filter?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; entries: Array<{ dnHint: string; rawLength: number }>; error?: string }> {
  const port = opts.port ?? (opts.useTls ? 636 : 389);
  let sock: Socket | null = null;
  try {
    sock = await ldapConnect(opts.host, port, !!opts.useTls, opts.timeoutMs ?? 10000);
    const bindResp = await ldapRoundTrip(sock, buildBindRequest(1, opts.bindDn, opts.bindPassword), opts.timeoutMs ?? 10000);
    if (!parseBindResult(bindResp).ok) return { ok: false, entries: [], error: 'bind_failed' };
    const searchResp = await ldapRoundTrip(
      sock,
      buildSearchRequest(2, opts.baseDn, opts.filter ?? '(objectClass=person)', 25),
      opts.timeoutMs ?? 10000,
    );
    // Count rough entry markers (SearchResultEntry tag 0x64)
    let count = 0;
    for (let i = 0; i < searchResp.length; i++) if (searchResp[i] === 0x64) count++;
    return {
      ok: true,
      entries: Array.from({ length: Math.min(count, 25) }, (_, i) => ({
        dnHint: `entry-${i + 1}`,
        rawLength: searchResp.length,
      })),
    };
  } catch (e) {
    return { ok: false, entries: [], error: (e as Error).message };
  } finally {
    sock?.destroy();
  }
}
