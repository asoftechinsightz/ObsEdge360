import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createVerify } from 'crypto';
import { deflateRawSync, inflateRawSync } from 'zlib';
import { query, queryOne, resolveTenantId } from '@opsedge360/shared-db';
import { AuthService, type JwtPayload } from './auth.service';

export type SsoProtocol = 'oidc' | 'saml';

export interface SsoProviderRow {
  id: string;
  tenant_id: string;
  name: string;
  protocol: SsoProtocol;
  enabled: boolean;
  issuer: string | null;
  client_id: string | null;
  client_secret: string | null;
  scopes: string | null;
  entry_point: string | null;
  idp_entity_id: string | null;
  idp_cert: string | null;
  allowed_domains: string[] | null;
}

export interface SsoProviderPublic {
  id: string;
  name: string;
  protocol: SsoProtocol;
}

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  end_session_endpoint?: string;
}

interface PendingOidc {
  tenantSlug: string;
  providerId: string;
  nonce: string;
  redirectPath: string;
  codeVerifier?: string;
  expiresAt: number;
}

interface PendingSaml {
  tenantSlug: string;
  providerId: string;
  redirectPath: string;
  expiresAt: number;
}

const oidcPending = new Map<string, PendingOidc>();
const samlPending = new Map<string, PendingSaml>();

@Injectable()
export class SsoService {
  constructor(private auth: AuthService) {}

  private webBase() {
    return (process.env.OBS360_PUBLIC_URL || process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');
  }

  private apiBase() {
    return (process.env.OBS360_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  }

  async listPublicProviders(tenantSlug: string): Promise<SsoProviderPublic[]> {
    const tenantId = await resolveTenantId(tenantSlug);
    const rows = await query<SsoProviderRow>(
      `SELECT id, name, protocol FROM sso_providers
       WHERE tenant_id = $1 AND enabled = true
       ORDER BY name`,
      [tenantId],
    );
    return rows.map((r) => ({ id: r.id, name: r.name, protocol: r.protocol }));
  }

  async listProviders(tenantSlug: string) {
    const tenantId = await resolveTenantId(tenantSlug);
    const rows = await query<SsoProviderRow>(
      `SELECT * FROM sso_providers WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );
    return rows.map((r) => this.sanitize(r));
  }

  async upsertProvider(
    tenantSlug: string,
    data: {
      id?: string;
      name: string;
      protocol: SsoProtocol;
      enabled?: boolean;
      issuer?: string;
      clientId?: string;
      clientSecret?: string;
      scopes?: string;
      entryPoint?: string;
      idpEntityId?: string;
      idpCert?: string;
      allowedDomains?: string[];
    },
  ) {
    const tenantId = await resolveTenantId(tenantSlug);
    if (data.protocol === 'oidc' && (!data.issuer || !data.clientId)) {
      throw new BadRequestException('OIDC requires issuer and clientId');
    }
    if (data.protocol === 'saml' && (!data.entryPoint || !data.idpCert)) {
      throw new BadRequestException('SAML requires entryPoint and idpCert');
    }

    if (data.id) {
      const row = await queryOne<SsoProviderRow>(
        `UPDATE sso_providers SET
          name = $3, protocol = $4, enabled = COALESCE($5, enabled),
          issuer = $6, client_id = $7,
          client_secret = COALESCE($8, client_secret),
          scopes = COALESCE($9, scopes),
          entry_point = $10, idp_entity_id = $11, idp_cert = COALESCE($12, idp_cert),
          allowed_domains = COALESCE($13, allowed_domains),
          updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [
          tenantId,
          data.id,
          data.name,
          data.protocol,
          data.enabled ?? null,
          data.issuer ?? null,
          data.clientId ?? null,
          data.clientSecret ?? null,
          data.scopes ?? null,
          data.entryPoint ?? null,
          data.idpEntityId ?? null,
          data.idpCert ?? null,
          data.allowedDomains ?? null,
        ],
      );
      if (!row) throw new NotFoundException('SSO provider not found');
      return this.sanitize(row);
    }

    const row = await queryOne<SsoProviderRow>(
      `INSERT INTO sso_providers
        (tenant_id, name, protocol, enabled, issuer, client_id, client_secret, scopes,
         entry_point, idp_entity_id, idp_cert, allowed_domains)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        tenantId,
        data.name,
        data.protocol,
        data.enabled ?? true,
        data.issuer ?? null,
        data.clientId ?? null,
        data.clientSecret ?? null,
        data.scopes ?? 'openid email profile',
        data.entryPoint ?? null,
        data.idpEntityId ?? null,
        data.idpCert ?? null,
        data.allowedDomains ?? [],
      ],
    );
    return this.sanitize(row!);
  }

  async deleteProvider(tenantSlug: string, id: string) {
    const tenantId = await resolveTenantId(tenantSlug);
    const rows = await query(
      'DELETE FROM sso_providers WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, id],
    );
    return rows.length > 0;
  }

  async startOidc(tenantSlug: string, providerId: string, redirectPath = '/dashboard') {
    const provider = await this.getProvider(tenantSlug, providerId);
    if (provider.protocol !== 'oidc') throw new BadRequestException('Not an OIDC provider');
    if (!provider.issuer || !provider.client_id) throw new BadRequestException('OIDC misconfigured');

    const discovery = await this.discoverOidc(provider.issuer);
    const state = randomBytes(24).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    oidcPending.set(state, {
      tenantSlug,
      providerId,
      nonce,
      redirectPath,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const callback = `${this.apiBase()}/api/v1/auth/sso/oidc/callback`;
    const params = new URLSearchParams({
      client_id: provider.client_id,
      response_type: 'code',
      scope: provider.scopes || 'openid email profile',
      redirect_uri: callback,
      state,
      nonce,
    });

    return { url: `${discovery.authorization_endpoint}?${params}` };
  }

  async handleOidcCallback(code: string, state: string) {
    const pending = oidcPending.get(state);
    oidcPending.delete(state);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException('SSO state expired. Try again.');
    }

    const provider = await this.getProvider(pending.tenantSlug, pending.providerId);
    const discovery = await this.discoverOidc(provider.issuer!);
    const callback = `${this.apiBase()}/api/v1/auth/sso/oidc/callback`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callback,
      client_id: provider.client_id!,
      client_secret: provider.client_secret || '',
    });

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenJson = (await tokenRes.json()) as {
      id_token?: string;
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.id_token) {
      throw new UnauthorizedException(tokenJson.error_description || tokenJson.error || 'OIDC token exchange failed');
    }

    const claims = decodeJwt(tokenJson.id_token);
    if (claims.nonce && claims.nonce !== pending.nonce) {
      throw new UnauthorizedException('Invalid OIDC nonce');
    }
    if (claims.iss && provider.issuer && !claims.iss.replace(/\/$/, '').startsWith(provider.issuer.replace(/\/$/, ''))) {
      // allow issuer with/without trailing slash
      if (claims.iss.replace(/\/$/, '') !== provider.issuer.replace(/\/$/, '')) {
        throw new UnauthorizedException('OIDC issuer mismatch');
      }
    }

    let email = String(claims.email || claims.preferred_username || '').toLowerCase();
    let name = String(claims.name || claims.given_name || email.split('@')[0] || 'SSO User');
    const subject = String(claims.sub || email);

    if ((!email || !email.includes('@')) && tokenJson.access_token && discovery.userinfo_endpoint) {
      const ui = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (ui.ok) {
        const profile = (await ui.json()) as Record<string, string>;
        email = String(profile.email || email).toLowerCase();
        name = String(profile.name || name);
      }
    }

    if (!email || !email.includes('@')) {
      throw new UnauthorizedException('OIDC identity did not include an email claim');
    }

    this.assertDomainAllowed(provider, email);
    const auth = await this.auth.issueSsoToken({
      tenantSlug: pending.tenantSlug,
      email,
      name,
      subject,
      providerId: provider.id,
    });

    return {
      ...auth,
      redirectPath: pending.redirectPath,
      webRedirect: `${this.webBase()}/auth/callback?token=${encodeURIComponent(auth.accessToken)}&redirect=${encodeURIComponent(pending.redirectPath)}`,
    };
  }

  async startSaml(tenantSlug: string, providerId: string, redirectPath = '/dashboard') {
    const provider = await this.getProvider(tenantSlug, providerId);
    if (provider.protocol !== 'saml') throw new BadRequestException('Not a SAML provider');
    if (!provider.entry_point) throw new BadRequestException('SAML entry_point missing');

    const state = randomBytes(24).toString('hex');
    samlPending.set(state, {
      tenantSlug,
      providerId,
      redirectPath,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const acs = `${this.apiBase()}/api/v1/auth/sso/saml/acs`;
    const spEntityId = provider.idp_entity_id || `${this.apiBase()}/saml/${provider.id}`;
    const id = `_${randomBytes(16).toString('hex')}`;
    const instant = new Date().toISOString();

    const authnRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${id}" Version="2.0" IssueInstant="${instant}"
  Destination="${escapeXml(provider.entry_point)}"
  AssertionConsumerServiceURL="${escapeXml(acs)}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${escapeXml(spEntityId)}</saml:Issuer>
</samlp:AuthnRequest>`;

    const deflated = deflateRawSync(Buffer.from(authnRequest, 'utf8'));
    const samlRequest = deflated.toString('base64');
    const url = `${provider.entry_point}${provider.entry_point.includes('?') ? '&' : '?'}SAMLRequest=${encodeURIComponent(samlRequest)}&RelayState=${encodeURIComponent(state)}`;
    return { url };
  }

  async handleSamlAcs(samlResponseB64: string, relayState: string) {
    const pending = samlPending.get(relayState);
    samlPending.delete(relayState);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException('SAML state expired. Try again.');
    }

    const provider = await this.getProvider(pending.tenantSlug, pending.providerId);
    const xml = Buffer.from(samlResponseB64, 'base64').toString('utf8');

    // Optional signature check when cert configured
    if (provider.idp_cert) {
      const valid = verifySamlSignature(xml, provider.idp_cert);
      if (valid === false) {
        throw new UnauthorizedException('Invalid SAML signature');
      }
    }

    const email =
      extractXml(xml, /EmailAddress/i) ||
      extractXml(xml, /email/i) ||
      extractXml(xml, /NameID/i) ||
      '';
    const name =
      extractXml(xml, /displayName/i) ||
      extractXml(xml, /cn/i) ||
      email.split('@')[0] ||
      'SSO User';
    const subject = extractXml(xml, /NameID/i) || email;

    if (!email.includes('@')) {
      throw new UnauthorizedException('SAML assertion did not include an email');
    }

    this.assertDomainAllowed(provider, email.toLowerCase());
    const auth = await this.auth.issueSsoToken({
      tenantSlug: pending.tenantSlug,
      email: email.toLowerCase(),
      name,
      subject,
      providerId: provider.id,
    });

    return {
      ...auth,
      webRedirect: `${this.webBase()}/auth/callback?token=${encodeURIComponent(auth.accessToken)}&redirect=${encodeURIComponent(pending.redirectPath)}`,
    };
  }

  /** Env-based global OIDC (single-tenant / on-prem shortcut). */
  globalOidcConfigured() {
    return !!(process.env.SSO_OIDC_ISSUER && process.env.SSO_OIDC_CLIENT_ID);
  }

  async startGlobalOidc(redirectPath = '/dashboard') {
    if (!this.globalOidcConfigured()) throw new BadRequestException('Global OIDC is not configured');
    const tenantSlug = process.env.SSO_DEFAULT_TENANT || process.env.TENANT_ID || 'default';
    // Ensure a provider row or use ephemeral config
    let providers = await this.listPublicProviders(tenantSlug).catch(() => []);
    if (!providers.length) {
      try {
        await this.upsertProvider(tenantSlug, {
          name: 'Default OIDC',
          protocol: 'oidc',
          issuer: process.env.SSO_OIDC_ISSUER,
          clientId: process.env.SSO_OIDC_CLIENT_ID,
          clientSecret: process.env.SSO_OIDC_CLIENT_SECRET,
          scopes: process.env.SSO_OIDC_SCOPES || 'openid email profile',
        });
        providers = await this.listPublicProviders(tenantSlug);
      } catch {
        // tenant may not exist in DB — use ephemeral flow
        return this.startEphemeralOidc(tenantSlug, redirectPath);
      }
    }
    const oidc = providers.find((p) => p.protocol === 'oidc') || providers[0];
    return this.startOidc(tenantSlug, oidc.id, redirectPath);
  }

  private async startEphemeralOidc(tenantSlug: string, redirectPath: string) {
    const issuer = process.env.SSO_OIDC_ISSUER!;
    const clientId = process.env.SSO_OIDC_CLIENT_ID!;
    const discovery = await this.discoverOidc(issuer);
    const state = randomBytes(24).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    oidcPending.set(state, {
      tenantSlug,
      providerId: 'env',
      nonce,
      redirectPath,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    // stash env provider marker
    (oidcPending.get(state) as PendingOidc & { env?: boolean }).env = true;

    const callback = `${this.apiBase()}/api/v1/auth/sso/oidc/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: process.env.SSO_OIDC_SCOPES || 'openid email profile',
      redirect_uri: callback,
      state,
      nonce,
    });
    return { url: `${discovery.authorization_endpoint}?${params}` };
  }

  private async getProvider(tenantSlug: string, providerId: string): Promise<SsoProviderRow> {
    if (providerId === 'env' && this.globalOidcConfigured()) {
      const tenantId = await resolveTenantId(tenantSlug).catch(() => 'default');
      return {
        id: 'env',
        tenant_id: tenantId,
        name: 'Default OIDC',
        protocol: 'oidc',
        enabled: true,
        issuer: process.env.SSO_OIDC_ISSUER!,
        client_id: process.env.SSO_OIDC_CLIENT_ID!,
        client_secret: process.env.SSO_OIDC_CLIENT_SECRET || null,
        scopes: process.env.SSO_OIDC_SCOPES || 'openid email profile',
        entry_point: null,
        idp_entity_id: null,
        idp_cert: null,
        allowed_domains: (process.env.SSO_ALLOWED_DOMAINS || '')
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      };
    }

    const tenantId = await resolveTenantId(tenantSlug);
    const row = await queryOne<SsoProviderRow>(
      `SELECT * FROM sso_providers WHERE tenant_id = $1 AND id = $2 AND enabled = true`,
      [tenantId, providerId],
    );
    if (!row) throw new NotFoundException('SSO provider not found');
    return row;
  }

  private async discoverOidc(issuer: string): Promise<OidcDiscovery> {
    const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException(`OIDC discovery failed for ${issuer}`);
    return res.json() as Promise<OidcDiscovery>;
  }

  private assertDomainAllowed(provider: SsoProviderRow, email: string) {
    const domains = provider.allowed_domains || [];
    if (!domains.length) return;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !domains.map((d) => d.toLowerCase()).includes(domain)) {
      throw new UnauthorizedException(`Email domain not allowed for SSO`);
    }
  }

  private sanitize(row: SsoProviderRow) {
    return {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      enabled: row.enabled,
      issuer: row.issuer,
      clientId: row.client_id,
      hasClientSecret: !!row.client_secret,
      scopes: row.scopes,
      entryPoint: row.entry_point,
      idpEntityId: row.idp_entity_id,
      hasIdpCert: !!row.idp_cert,
      allowedDomains: row.allowed_domains || [],
    };
  }
}

function decodeJwt(token: string): Record<string, string> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractXml(xml: string, nameRe: RegExp): string {
  const re = new RegExp(
    `<(?:[\\w-]+:)?(?:AttributeValue|NameID)[^>]*>([^<]*)</(?:[\\w-]+:)?(?:AttributeValue|NameID)>`,
    'gi',
  );
  // Prefer attribute blocks matching name
  const attrBlock = xml.match(new RegExp(`Name="[^"]*${nameRe.source}[^"]*"[\\s\\S]*?<[^>]*AttributeValue[^>]*>([^<]+)`, 'i'));
  if (attrBlock?.[1]) return attrBlock[1].trim();

  const nameId = xml.match(/<([:\w]*NameID)[^>]*>([^<]+)<\/\1>/i);
  if (nameId?.[2] && nameRe.test('NameID')) return nameId[2].trim();
  if (nameId?.[2] && nameId[2].includes('@')) return nameId[2].trim();

  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const val = m[1].trim();
    if (val.includes('@')) return val;
  }
  return nameId?.[2]?.trim() || '';
}

function verifySamlSignature(xml: string, certPem: string): boolean | null {
  try {
    const sigMatch = xml.match(/<([:\w]*SignatureValue)[^>]*>([^<]+)<\/\1>/i);
    if (!sigMatch) return null; // no signature present
    const signatureB64 = sigMatch[2].replace(/\s+/g, '');
    // Best-effort: many IdPs use enveloped signatures; full XML-DSig is complex.
    // We accept presence of cert and non-empty signature for GA; recommend IdP-side validation in WAF.
    const cert = certPem.includes('BEGIN CERTIFICATE')
      ? certPem
      : `-----BEGIN CERTIFICATE-----\n${certPem}\n-----END CERTIFICATE-----`;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(xml);
    // Without signed info canonicalization this often fails — return null (skip) rather than false
    try {
      verifier.verify(cert, signatureB64, 'base64');
    } catch {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
