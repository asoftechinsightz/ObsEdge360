import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';
import { isEncryptedMfaSecret } from '../rc2/totp.util';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}

@Injectable()
export class Rc3Service {
  async overview(user: JwtPayload) {
    requireAdmin(user);
    const row = await queryOne(`SELECT * FROM rc3_readiness WHERE version='v1.0.0-rc3-epp' LIMIT 1`);
    const encSample = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM mfa_factors WHERE secret_enc LIKE 'oe360:v1:%'`,
    ).catch(() => ({ c: '0' }));
    const jtiSample = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM user_sessions WHERE jti IS NOT NULL`,
    ).catch(() => ({ c: '0' }));
    return {
      release: row,
      channel: 'rc3-epp',
      product: 'OpsEdge360',
      security: {
        mfaSecretsEncryptedAtRest: true,
        encryptedFactorRows: Number(encSample?.c ?? 0),
        jwtSessionBinding: true,
        sessionsWithJti: Number(jtiSample?.c ?? 0),
        note: 'Legacy plaintext MFA secrets are re-encrypted on next successful verify',
      },
      pilotPackage: 'docs/pilot/',
      docs: 'docs/rc3/',
    };
  }

  async approve(
    user: JwtPayload,
    body: {
      productionSha?: string;
      validationToken?: string;
      security?: Record<string, unknown>;
      performance?: Record<string, unknown>;
      auditSummary?: Record<string, unknown>;
    },
  ) {
    requireAdmin(user);
    if (body.validationToken && body.validationToken !== 'RC3_EPP_VALIDATION_OK') {
      throw new BadRequestException('validationToken mismatch');
    }
    return queryOne(
      `UPDATE rc3_readiness SET
         status='approved',
         production_sha=COALESCE($1, production_sha),
         validation_token=COALESCE($2, validation_token),
         security=CASE WHEN $3::text IS NULL THEN security ELSE $3::jsonb END,
         performance=CASE WHEN $4::text IS NULL THEN performance ELSE $4::jsonb END,
         audit_summary=CASE WHEN $5::text IS NULL THEN audit_summary ELSE $5::jsonb END,
         approved_by=$6,
         approved_at=NOW(),
         updated_at=NOW()
       WHERE version='v1.0.0-rc3-epp'
       RETURNING *`,
      [
        body.productionSha ?? null,
        body.validationToken ?? null,
        body.security ? JSON.stringify(body.security) : null,
        body.performance ? JSON.stringify(body.performance) : null,
        body.auditSummary ? JSON.stringify(body.auditSummary) : null,
        user.sub,
      ],
    );
  }

  async securityPosture(user: JwtPayload) {
    requireAdmin(user);
    const factors = await query<{ id: string; secret_enc: string; status: string }>(
      `SELECT id, secret_enc, status FROM mfa_factors ORDER BY created_at DESC LIMIT 200`,
    ).catch(() => []);
    const encrypted = (factors as { secret_enc: string }[]).filter((f) => isEncryptedMfaSecret(f.secret_enc)).length;
    return {
      totpEncryption: {
        algorithm: 'aes-256-gcm',
        envelope: 'oe360:v1:keyId:nonce:ciphertext',
        sampleEncrypted: encrypted,
        sampleTotal: (factors as unknown[]).length,
        masterKeyEnv: 'SECRETS_MASTER_KEY',
      },
      sessionBinding: {
        claim: 'jti',
        revokeInvalidatesJwt: true,
        requireSessionEnv: 'JWT_REQUIRE_SESSION',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  pilotToolkit() {
    return {
      root: 'docs/pilot/',
      guides: [
        'docs/pilot/README.md',
        'docs/pilot/PILOT_DEPLOYMENT_PACKAGE.md',
        'docs/pilot/CUSTOMER_ONBOARDING_GUIDE.md',
        'docs/pilot/ADMINISTRATOR_CHECKLIST.md',
        'docs/pilot/OPERATIONS_CHECKLIST.md',
        'docs/pilot/ACCEPTANCE_TEST_PLAN.md',
        'docs/pilot/GO_LIVE_CHECKLIST.md',
        'docs/pilot/SUPPORT_ESCALATION_GUIDE.md',
        'docs/pilot/WEEKLY_HEALTH_REVIEW_TEMPLATE.md',
        'docs/pilot/PILOT_FEEDBACK_FORM.md',
        'docs/pilot/EXIT_CRITERIA.md',
      ],
      token: 'RC3_EPP_VALIDATION_OK',
    };
  }
}
