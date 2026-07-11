-- Wave 7: SPIFFE / mTLS trust mesh (migration 021)
-- Immutable once applied in production.

ALTER TABLE service_identities
  ADD COLUMN IF NOT EXISTS spiffe_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_identities_spiffe
  ON service_identities (spiffe_id)
  WHERE spiffe_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS trust_ca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_domain TEXT NOT NULL,
  subject_cn TEXT NOT NULL,
  fingerprint_sha256 TEXT NOT NULL UNIQUE,
  pem_cert TEXT NOT NULL,
  enc_private_key TEXT,
  enc_nonce TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trust_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL,
  pem_bundle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (version)
);

CREATE TABLE IF NOT EXISTS workload_svids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES service_identities(id) ON DELETE CASCADE,
  spiffe_id TEXT NOT NULL,
  serial TEXT NOT NULL,
  fingerprint_sha256 TEXT NOT NULL,
  pem_cert TEXT NOT NULL,
  enc_private_key TEXT NOT NULL,
  enc_nonce TEXT NOT NULL,
  not_before TIMESTAMPTZ NOT NULL,
  not_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'rotated', 'revoked')),
  rotated_from UUID REFERENCES workload_svids(id),
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workload_svids_identity ON workload_svids (identity_id);
CREATE INDEX IF NOT EXISTS idx_workload_svids_status ON workload_svids (status);
CREATE INDEX IF NOT EXISTS idx_workload_svids_expiry ON workload_svids (not_after)
  WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS uq_workload_svids_active_identity
  ON workload_svids (identity_id)
  WHERE status = 'active';
