-- OpsEdge360 Auth — password credentials
-- Version: 006

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
