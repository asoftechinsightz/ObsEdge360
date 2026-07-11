import { createHash, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface ServiceJwtClaims {
  sub: string;
  tid: string;
  kind: string;
  scopes: string[];
  iss: string;
  aud: string;
  jti: string;
  iat?: number;
  exp?: number;
}

const ISS = 'opsedge360-trust';
const AUD = 'opsedge360-services';

export function serviceJwtSecret(): string {
  return process.env.SERVICE_JWT_SECRET ?? process.env.JWT_SECRET ?? 'opsedge360-dev-service-jwt';
}

export function mintServiceJwt(input: {
  identityId: string;
  tenantId: string;
  kind: string;
  scopes: string[];
  ttlSeconds?: number;
}): { token: string; expiresIn: number; jti: string } {
  const ttl = input.ttlSeconds ?? Number(process.env.SERVICE_JWT_TTL_SECONDS ?? 600);
  const jti = randomUUID();
  const payload: ServiceJwtClaims = {
    sub: input.identityId,
    tid: input.tenantId,
    kind: input.kind,
    scopes: input.scopes,
    iss: ISS,
    aud: AUD,
    jti,
  };
  const token = jwt.sign(payload, serviceJwtSecret(), {
    expiresIn: ttl,
    algorithm: 'HS256',
  });
  return { token, expiresIn: ttl, jti };
}

export function verifyServiceJwt(token: string): ServiceJwtClaims {
  const decoded = jwt.verify(token, serviceJwtSecret(), {
    algorithms: ['HS256'],
    issuer: ISS,
    audience: AUD,
  }) as ServiceJwtClaims;
  return decoded;
}

export function hashCredential(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function serviceAuthEnabled(): boolean {
  return process.env.SERVICE_AUTH_ENABLED === 'true';
}

export function serviceAuthRequired(): boolean {
  return process.env.SERVICE_AUTH_REQUIRED === 'true';
}
