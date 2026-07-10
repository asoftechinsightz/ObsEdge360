import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import { hashPassword, verifyPassword, slugifyOrg } from './password.util';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  name?: string;
}

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: string;
  password_hash: string | null;
  slug: string;
}

const WEAK_SECRETS = new Set([
  '',
  'change-me-in-production-use-256-bit-key',
  'trinetra360-dev-secret-change-in-production',
  'REPLACE_WITH_256_BIT_SECRET',
]);

@Injectable()
export class AuthService {
  private readonly secret = process.env.JWT_SECRET ?? 'trinetra360-dev-secret-change-in-production';
  private readonly expiresIn = process.env.JWT_EXPIRES_IN ?? '24h';

  constructor() {
    if (process.env.NODE_ENV === 'production' && WEAK_SECRETS.has(this.secret)) {
      throw new Error('JWT_SECRET must be set to a strong value in production');
    }
  }

  private issueToken(user: UserRow): { accessToken: string; user: JwtPayload } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.slug,
      role: user.role,
      name: user.name ?? undefined,
    };
    const accessToken = jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
    return { accessToken, user: payload };
  }

  private async findUser(email: string, tenantSlug?: string): Promise<UserRow | null> {
    if (tenantSlug) {
      return queryOne<UserRow>(
        `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, t.slug
         FROM users u JOIN tenants t ON t.id = u.tenant_id
         WHERE u.email = $1 AND t.slug = $2 LIMIT 1`,
        [email.toLowerCase(), tenantSlug],
      );
    }
    const rows = await query<UserRow>(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, t.slug
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()],
    );
    if (rows.length === 1) return rows[0];
    if (rows.length > 1) {
      throw new BadRequestException('Multiple organizations found. Specify organization slug.');
    }
    return null;
  }

  private isDevAuthOptional(): boolean {
    return process.env.AUTH_REQUIRED === 'false'
      || (process.env.NODE_ENV !== 'production' && process.env.AUTH_REQUIRED !== 'true');
  }

  async login(email: string, password: string, tenantId?: string): Promise<{ accessToken: string; user: JwtPayload }> {
    const allowDevBypass = this.isDevAuthOptional();

    let user: UserRow | null = null;
    try {
      user = await this.findUser(email, tenantId);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // DB down / not migrated — allow local dev login when auth is optional
      if (allowDevBypass) {
        console.warn('[auth] DB unavailable, using dev login:', (err as Error).message);
        return this.devLogin(email, tenantId);
      }
      throw new BadRequestException('Database unavailable. Start Postgres and run npm run db:migrate.');
    }

    if (!user?.password_hash) {
      if (allowDevBypass) {
        return this.devLogin(email, tenantId);
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  async signup(
    email: string,
    password: string,
    name: string,
    organizationName: string,
  ): Promise<{ accessToken: string; user: JwtPayload }> {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let slug = slugifyOrg(organizationName);

    const existingAny = await queryOne<{ id: string }>(
      'SELECT u.id FROM users u WHERE u.email = $1 LIMIT 1',
      [normalizedEmail],
    );
    if (existingAny) {
      throw new ConflictException('An account with this email already exists');
    }

    let existingSlug: { id: string } | null;
    try {
      existingSlug = await queryOne<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [slug]);
    } catch (err) {
      if (this.isDevAuthOptional()) {
        console.warn('[auth] DB unavailable, using dev signup:', (err as Error).message);
        return this.devLogin(normalizedEmail, slug);
      }
      throw new BadRequestException('Database unavailable. Start Postgres and run npm run db:migrate.');
    }

    if (existingSlug) {
      slug = `${slug}-${randomSuffix()}`;
    }

    const existingUser = await queryOne<{ id: string }>(
      'SELECT u.id FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1 AND t.slug = $2',
      [normalizedEmail, slug],
    );
    if (existingUser) {
      throw new ConflictException('An account with this email already exists for this organization');
    }

    const tenantRows = await query<{ id: string; slug: string }>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, slug`,
      [organizationName.trim(), slug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new BadRequestException('Failed to create organization');

    const passwordHash = hashPassword(password);
    const userRows = await query<UserRow>(
      `INSERT INTO users (tenant_id, email, name, role, password_hash)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id, tenant_id, email, name, role, password_hash`,
      [tenant.id, normalizedEmail, name.trim(), passwordHash],
    );
    const user = userRows[0];
    if (!user) throw new BadRequestException('Failed to create user');

    return this.issueToken({ ...user, slug: tenant.slug });
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }

  /** Sliding access-token refresh — same identity, new expiry (Wave 1 session foundation). */
  refreshToken(token: string): { accessToken: string; user: JwtPayload; expiresIn: string } {
    let payload: JwtPayload;
    try {
      payload = this.verifyToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const next: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      name: payload.name,
    };
    const accessToken = jwt.sign(next, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
    return { accessToken, user: next, expiresIn: this.expiresIn };
  }

  async me(user: JwtPayload) {
    const { buildAuthContext } = await import('@opsedge360/shared-security');
    let authContext = null;
    try {
      authContext = await buildAuthContext({
        userId: user.sub,
        tenantSlug: user.tenantId,
        legacyRole: user.role,
      });
    } catch {
      authContext = null;
    }
    return {
      ...user,
      roles: authContext?.roles ?? [user.role],
      permissions: authContext?.permissions ?? [],
    };
  }

  async requestPasswordReset(email: string, tenantSlug?: string): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    let user: UserRow | null = null;
    try {
      user = await this.findUser(normalizedEmail, tenantSlug);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unable to process password reset');
    }
    const generic = { message: 'If an account exists, password reset instructions have been sent.' };
    if (!user?.password_hash) return generic;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt.toISOString()],
    );

    const webBase = process.env.OBS360_PUBLIC_URL ?? process.env.OE360_PUBLIC_URL ?? 'http://localhost:3000';
    const resetUrl = `${webBase}/reset-password?token=${rawToken}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[auth] Password reset link for ${normalizedEmail}: ${resetUrl}`);
      return { ...generic, resetToken: rawToken };
    }
    return generic;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [tokenHash],
    );
    if (!row) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL',
      [tokenHash],
    );
    return { message: 'Password updated successfully' };
  }

  /** Upsert SSO user and issue JWT (OIDC/SAML). */
  async issueSsoToken(input: {
    tenantSlug: string;
    email: string;
    name: string;
    subject: string;
    providerId: string;
  }): Promise<{ accessToken: string; user: JwtPayload }> {
    const email = input.email.toLowerCase().trim();
    let tenant = await queryOne<{ id: string; slug: string }>(
      'SELECT id, slug FROM tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
      [input.tenantSlug],
    );

    if (!tenant) {
      const rows = await query<{ id: string; slug: string }>(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, slug`,
        [input.tenantSlug, input.tenantSlug],
      );
      tenant = rows[0];
    }
    if (!tenant) throw new BadRequestException('Unable to resolve tenant for SSO');

    const providerId = input.providerId === 'env' ? null : input.providerId;

    let user = await queryOne<UserRow>(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, t.slug
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.tenant_id = $1 AND (u.email = $2 OR u.sso_subject = $3)
       LIMIT 1`,
      [tenant.id, email, input.subject],
    );

    if (!user) {
      const rows = await query<UserRow>(
        `INSERT INTO users (tenant_id, email, name, role, password_hash, sso_subject, sso_provider_id)
         VALUES ($1, $2, $3, 'operator', NULL, $4, $5)
         RETURNING id, tenant_id, email, name, role, password_hash`,
        [tenant.id, email, input.name, input.subject, providerId],
      );
      user = rows[0] ? { ...rows[0], slug: tenant.slug } : null;
    } else {
      await query(
        `UPDATE users SET name = COALESCE(NULLIF($2, ''), name), sso_subject = $3, sso_provider_id = COALESCE($4, sso_provider_id)
         WHERE id = $1`,
        [user.id, input.name, input.subject, providerId],
      );
      user = { ...user, name: input.name || user.name, slug: tenant.slug };
    }

    if (!user) throw new BadRequestException('Failed to provision SSO user');
    return this.issueToken({ ...user, slug: tenant.slug });
  }

  private devLogin(email: string, tenantId = 'default'): { accessToken: string; user: JwtPayload } {
    const user: JwtPayload = {
      sub: email.split('@')[0],
      email,
      tenantId,
      role: email.includes('admin') ? 'admin' : 'operator',
    };
    const accessToken = jwt.sign(user, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
    return { accessToken, user };
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
