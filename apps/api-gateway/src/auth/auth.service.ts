import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';
import { incSecurityMetric } from '@opsedge360/shared-security';
import { hashPassword, verifyPassword, slugifyOrg } from './password.util';
import { hashBackupCode, labChallengeCode, labCodesEnabled, decryptMfaSecret, verifyTotp } from '../rc2/totp.util';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  name?: string;
  jti?: string;
  sid?: string;
}

export interface MfaChallengePayload {
  purpose: 'mfa_challenge';
  sub: string;
  email: string;
  tenantId: string;
  tenantUuid: string;
  role: string;
  name?: string;
}

export type LoginResult =
  | {
      accessToken: string;
      user: JwtPayload;
      passwordMustRotate?: boolean;
      mustEnrollMfa?: boolean;
    }
  | {
      mfaRequired: true;
      mfaToken: string;
      user: { email: string; tenantId: string; name?: string };
      methods: string[];
      passwordMustRotate?: boolean;
    };

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

  private issueToken(user: UserRow, opts?: { jti?: string; sid?: string }): { accessToken: string; user: JwtPayload } {
    const jti = opts?.jti ?? randomBytes(16).toString('hex');
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.slug,
      role: user.role,
      name: user.name ?? undefined,
      jti,
      sid: opts?.sid,
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

  async login(email: string, password: string, tenantId?: string): Promise<LoginResult> {
    const allowDevBypass = this.isDevAuthOptional();
    const normalizedEmail = email.toLowerCase().trim();

    const lock = await queryOne<{ locked_until: string | null }>(
      `SELECT locked_until FROM auth_lockouts WHERE email = $1`,
      [normalizedEmail],
    ).catch(() => null);
    if (lock?.locked_until && new Date(lock.locked_until).getTime() > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked due to failed login attempts');
    }

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
      await this.recordLoginFailure(normalizedEmail, undefined);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!verifyPassword(password, user.password_hash)) {
      await this.recordLoginFailure(normalizedEmail, user.tenant_id);
      throw new UnauthorizedException('Invalid email or password');
    }

    await query(`DELETE FROM auth_lockouts WHERE email = $1`, [normalizedEmail]).catch(() => undefined);

    const mfaGate = await this.resolveMfaGate(user);
    if (mfaGate.challenge) {
      await query(
        `INSERT INTO login_history (tenant_id, user_id, email, event, success, risk_score, metadata)
         VALUES ($1,$2,$3,'mfa_challenge',true,10,'{"source":"password"}'::jsonb)`,
        [user.tenant_id, user.id, normalizedEmail],
      ).catch(() => undefined);
      const mfaToken = jwt.sign(
        {
          purpose: 'mfa_challenge',
          sub: user.id,
          email: user.email,
          tenantId: user.slug,
          tenantUuid: user.tenant_id,
          role: user.role,
          name: user.name ?? undefined,
        } satisfies MfaChallengePayload,
        this.secret,
        { expiresIn: '5m' },
      );
      return {
        mfaRequired: true,
        mfaToken,
        user: { email: user.email, tenantId: user.slug, name: user.name ?? undefined },
        methods: ['totp', 'backup'],
        passwordMustRotate: mfaGate.passwordMustRotate,
      };
    }

    return this.completeLogin(user, {
      passwordMustRotate: mfaGate.passwordMustRotate,
      mustEnrollMfa: mfaGate.mustEnrollMfa,
      source: 'password',
    });
  }

  /** Complete MFA step after password login challenge. */
  async verifyMfaLogin(mfaToken: string, code: string): Promise<LoginResult> {
    if (!code?.trim()) throw new BadRequestException('MFA code required');
    let challenge: MfaChallengePayload;
    try {
      const decoded = jwt.verify(mfaToken, this.secret) as MfaChallengePayload;
      if (decoded.purpose !== 'mfa_challenge' || !decoded.sub) {
        throw new UnauthorizedException('Invalid MFA challenge');
      }
      challenge = decoded;
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }

    const factor = await queryOne<{ id: string; secret_enc: string }>(
      `SELECT id, secret_enc FROM mfa_factors WHERE user_id=$1 AND status='active' ORDER BY verified_at DESC NULLS LAST LIMIT 1`,
      [challenge.sub],
    );
    if (!factor?.secret_enc) {
      throw new UnauthorizedException('No active MFA factor — enroll TOTP first');
    }

    const asBackup = await this.tryConsumeBackupCode(challenge.sub, code);
    let plaintextSecret = '';
    try {
      plaintextSecret = decryptMfaSecret(factor.secret_enc);
    } catch {
      throw new UnauthorizedException('MFA secret unavailable');
    }
    const totpOk = /^\d{6}$/.test(code) && verifyTotp(plaintextSecret, code, 1);
    const labOk = labCodesEnabled() && code === labChallengeCode(plaintextSecret);

    if (!totpOk && !asBackup && !labOk) {
      await query(
        `INSERT INTO login_history (tenant_id, user_id, email, event, success, risk_score, metadata)
         VALUES ($1,$2,$3,'mfa_failed',false,40,$4::jsonb)`,
        [
          challenge.tenantUuid,
          challenge.sub,
          challenge.email,
          JSON.stringify({ source: 'login_mfa' }),
        ],
      ).catch(() => undefined);
      throw new UnauthorizedException('Invalid MFA or backup code');
    }

    const user: UserRow = {
      id: challenge.sub,
      tenant_id: challenge.tenantUuid,
      email: challenge.email,
      name: challenge.name ?? null,
      role: challenge.role,
      password_hash: null,
      slug: challenge.tenantId,
    };
    const rot = await this.passwordMustRotateFlag(challenge.sub);
    return this.completeLogin(user, {
      passwordMustRotate: rot,
      source: asBackup ? 'mfa_backup' : totpOk ? 'mfa_totp' : 'mfa_lab',
    });
  }

  private async completeLogin(
    user: UserRow,
    opts: { passwordMustRotate?: boolean; mustEnrollMfa?: boolean; source: string },
  ): Promise<LoginResult> {
    const jti = randomBytes(16).toString('hex');
    const session = await queryOne<{ id: string }>(
      `INSERT INTO user_sessions (user_id, tenant_id, device_label, last_seen_at, expires_at, jti)
       VALUES ($1, $2, 'web', NOW(), NOW() + INTERVAL '24 hours', $3)
       RETURNING id`,
      [user.id, user.tenant_id, jti],
    ).catch(() => null);
    // Fallback if jti column missing (pre-047): insert without jti
    if (!session) {
      await query(
        `INSERT INTO user_sessions (user_id, tenant_id, device_label, last_seen_at, expires_at)
         VALUES ($1, $2, 'web', NOW(), NOW() + INTERVAL '24 hours')`,
        [user.id, user.tenant_id],
      ).catch(() => undefined);
    }
    await query(
      `INSERT INTO login_history (tenant_id, user_id, email, event, success, risk_score, metadata)
       VALUES ($1,$2,$3,'login',true,0,$4::jsonb)`,
      [
        user.tenant_id,
        user.id,
        user.email.toLowerCase(),
        JSON.stringify({ source: opts.source, jti }),
      ],
    ).catch(() => undefined);
    const issued = this.issueToken(user, { jti, sid: session?.id });
    return {
      ...issued,
      passwordMustRotate: opts.passwordMustRotate,
      mustEnrollMfa: opts.mustEnrollMfa,
    };
  }

  private async resolveMfaGate(user: UserRow): Promise<{
    challenge: boolean;
    mustEnrollMfa: boolean;
    passwordMustRotate: boolean;
  }> {
    const policy = await queryOne<{ mode: string }>(
      `SELECT mode FROM mfa_policies WHERE tenant_id=$1`,
      [user.tenant_id],
    ).catch(() => null);
    const mode = policy?.mode ?? 'optional';
    const activeFactor = await queryOne<{ id: string }>(
      `SELECT id FROM mfa_factors WHERE user_id=$1 AND status='active' LIMIT 1`,
      [user.id],
    ).catch(() => null);
    const passwordMustRotate = await this.passwordMustRotateFlag(user.id);
    const required = mode === 'required';
    return {
      challenge: required && !!activeFactor,
      mustEnrollMfa: required && !activeFactor,
      passwordMustRotate,
    };
  }

  private async passwordMustRotateFlag(userId: string): Promise<boolean> {
    const row = await queryOne<{ password_changed_at: string | null; password_must_rotate: boolean }>(
      `SELECT password_changed_at, password_must_rotate FROM users WHERE id=$1`,
      [userId],
    ).catch(() => null);
    if (!row) return false;
    if (row.password_must_rotate) return true;
    const maxDays = Number(process.env.PASSWORD_MAX_AGE_DAYS || 90);
    if (row.password_changed_at) {
      const ageDays = (Date.now() - new Date(row.password_changed_at).getTime()) / 86400000;
      if (ageDays > maxDays) return true;
    }
    return false;
  }

  private async tryConsumeBackupCode(userId: string, code: string): Promise<boolean> {
    const hash = hashBackupCode(code);
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM mfa_backup_codes WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL LIMIT 1`,
      [userId, hash],
    );
    if (!row) return false;
    await query(`UPDATE mfa_backup_codes SET used_at=NOW() WHERE id=$1`, [row.id]);
    return true;
  }

  async signup(
    email: string,
    password: string,
    name: string,
    organizationName: string,
  ): Promise<{ accessToken: string; user: JwtPayload }> {
    await this.enforcePasswordPolicy(password);

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

    await query(
      `INSERT INTO security_policies (tenant_id, policy_type, config)
       VALUES
         ($1, 'password', '{"minLength":8,"requireComplexity":false,"maxFailedAttempts":5,"lockoutMinutes":15,"historyCount":0}'::jsonb),
         ($1, 'session', '{"sessionTimeoutMinutes":1440,"idleTimeoutMinutes":60,"maxConcurrentSessions":10,"deviceTracking":true,"forcedLogoutEnabled":true}'::jsonb)
       ON CONFLICT (tenant_id, policy_type) DO NOTHING`,
      [tenant.id],
    ).catch(() => undefined);

    return this.completeLogin(
      { ...user, slug: tenant.slug },
      { source: 'signup' },
    ) as Promise<{ accessToken: string; user: JwtPayload }>;
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }

  /** Verify JWT and reject revoked sessions (RC3 jti binding). */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    let payload: JwtPayload;
    try {
      payload = this.verifyToken(token);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'TokenExpiredError') incSecurityMetric('security.auth.expired_token');
      else incSecurityMetric('security.auth.invalid_token');
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.jti) {
      const row = await queryOne<{ revoked_at: string | null; expires_at: string | null }>(
        `SELECT revoked_at, expires_at FROM user_sessions WHERE jti=$1 LIMIT 1`,
        [payload.jti],
      ).catch(() => null);
      if (!row) {
        // Legacy session row missing jti column / wiped — allow unless strict
        if (process.env.JWT_REQUIRE_SESSION === 'true') {
          throw new UnauthorizedException('Session not found');
        }
      } else if (row.revoked_at) {
        incSecurityMetric('security.auth.invalid_token');
        throw new UnauthorizedException('Session revoked');
      } else if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        throw new UnauthorizedException('Session expired');
      } else {
        await query(`UPDATE user_sessions SET last_seen_at=NOW() WHERE jti=$1 AND revoked_at IS NULL`, [
          payload.jti,
        ]).catch(() => undefined);
      }
    }
    return payload;
  }

  /** Sliding access-token refresh — preserves jti/session binding. */
  async refreshToken(token: string): Promise<{ accessToken: string; user: JwtPayload; expiresIn: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.verifyAccessToken(token);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        incSecurityMetric('security.auth.refresh_failure');
        throw err;
      }
      incSecurityMetric('security.auth.refresh_failure');
      throw new UnauthorizedException('Invalid or expired token');
    }
    const next: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      name: payload.name,
      jti: payload.jti,
      sid: payload.sid,
    };
    const accessToken = jwt.sign(next, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
    incSecurityMetric('security.auth.refresh_success');
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
    await this.enforcePasswordPolicy(newPassword);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await queryOne<{ user_id: string; tenant_id?: string }>(
      `SELECT prt.user_id, u.tenant_id
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL
       ORDER BY prt.created_at DESC LIMIT 1`,
      [tokenHash],
    );
    if (!row) throw new BadRequestException('Invalid or expired reset token');

    await this.enforcePasswordPolicy(newPassword, row.tenant_id);
    const passwordHash = hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL',
      [tokenHash],
    );
    await query(
      `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
      [row.user_id, passwordHash],
    ).catch(() => undefined);
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
    const result = await this.completeLogin({ ...user, slug: tenant.slug }, { source: 'sso' });
    if ('mfaRequired' in result) {
      // SSO users with MFA required still need challenge — rare at provision time
      throw new BadRequestException('MFA challenge required after SSO — complete password MFA enroll first');
    }
    return result;
  }

  private async enforcePasswordPolicy(password: string, tenantId?: string) {
    let policy: Record<string, unknown> = { minLength: 8, requireComplexity: false };
    if (tenantId) {
      const row = await queryOne<{ config: Record<string, unknown> }>(
        `SELECT config FROM security_policies WHERE tenant_id = $1 AND policy_type = 'password'`,
        [tenantId],
      ).catch(() => null);
      if (row?.config) policy = row.config;
    }
    const minLength = Number(policy.minLength ?? 8);
    if (password.length < minLength) {
      throw new BadRequestException(`Password must be at least ${minLength} characters`);
    }
    if (policy.requireComplexity) {
      const ok =
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);
      if (!ok) {
        throw new BadRequestException('Password must include upper, lower, number, and special character');
      }
    }
  }

  private async recordLoginFailure(email: string, tenantId?: string) {
    try {
      const policy = tenantId
        ? await queryOne<{ config: Record<string, unknown> }>(
            `SELECT config FROM security_policies WHERE tenant_id = $1 AND policy_type = 'password'`,
            [tenantId],
          )
        : null;
      const maxFail = Number(policy?.config?.maxFailedAttempts ?? 5);
      const lockMinutes = Number(policy?.config?.lockoutMinutes ?? 15);
      const row = await queryOne<{ failure_count: number }>(
        `INSERT INTO auth_lockouts (tenant_id, email, failure_count, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (email) DO UPDATE SET
           failure_count = auth_lockouts.failure_count + 1,
           updated_at = NOW()
         RETURNING failure_count`,
        [tenantId ?? null, email],
      );
      if (row && row.failure_count >= maxFail) {
        await query(
          `UPDATE auth_lockouts SET locked_until = NOW() + ($1::text || ' minutes')::interval WHERE email = $2`,
          [String(lockMinutes), email],
        );
      }
      await query(
        `INSERT INTO login_history (tenant_id, email, event, success, risk_score, metadata)
         VALUES ($1,$2,'login_failed',false,$3,$4::jsonb)`,
        [
          tenantId ?? null,
          email,
          Math.min(100, (row?.failure_count ?? 1) * 10),
          JSON.stringify({ failureCount: row?.failure_count ?? 1 }),
        ],
      ).catch(() => undefined);
    } catch {
      /* migration 035 may not be applied yet */
    }
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
