-- 027_ops_dashboards.sql
-- Phase 3 Wave 6 — Operations Dashboards (thin NOC studio)

CREATE TABLE IF NOT EXISTS ops_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  layout_version INT NOT NULL DEFAULT 1,
  refresh_seconds INT NOT NULL DEFAULT 30,
  visibility VARCHAR(20) NOT NULL DEFAULT 'tenant',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_dashboards_tenant
  ON ops_dashboards (tenant_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_dashboards_default
  ON ops_dashboards (tenant_id)
  WHERE is_default = true;

CREATE TABLE IF NOT EXISTS ops_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES ops_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  grid_x INT NOT NULL DEFAULT 0,
  grid_y INT NOT NULL DEFAULT 0,
  grid_w INT NOT NULL DEFAULT 4,
  grid_h INT NOT NULL DEFAULT 3,
  data_source JSONB NOT NULL DEFAULT '{}',
  options JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_dashboard_widgets_dash
  ON ops_dashboard_widgets (tenant_id, dashboard_id, sort_order);

CREATE TABLE IF NOT EXISTS ops_dashboard_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES ops_dashboards(id) ON DELETE CASCADE,
  principal_type VARCHAR(20) NOT NULL,
  principal_id VARCHAR(255) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dashboard_id, principal_type, principal_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_dashboard_shares_tenant
  ON ops_dashboard_shares (tenant_id, dashboard_id);
