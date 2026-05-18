-- ============================================================
-- INVINCIBLE PANEL — PostgreSQL Database Schema
-- ============================================================
-- Run this against your Vercel Postgres / Neon / PlanetScale DB
-- before deploying the API.

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username           VARCHAR(32) UNIQUE NOT NULL,
  password_hash      VARCHAR(64) NOT NULL,
  password_salt      VARCHAR(32) NOT NULL,
  role               VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  telegram_id        VARCHAR(20),
  telegram_username  VARCHAR(64),
  firebase_config_id UUID REFERENCES firebase_configs(id) ON DELETE SET NULL,
  api_quota          INTEGER DEFAULT 1000,
  api_used           INTEGER DEFAULT 0,
  is_active          BOOLEAN DEFAULT TRUE,
  expires_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  last_login         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_users_expires_at ON users(expires_at) WHERE expires_at IS NOT NULL;

-- ── Firebase Configurations ───────────────────────────────────
CREATE TABLE firebase_configs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(64) NOT NULL,
  project_id        VARCHAR(64) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  auth_domain       VARCHAR(128) NOT NULL,
  database_url      VARCHAR(256) NOT NULL,
  storage_bucket    VARCHAR(128),
  status            VARCHAR(10) DEFAULT 'unknown' CHECK (status IN ('active', 'error', 'unknown')),
  assigned_users_count INTEGER DEFAULT 0,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_firebase_configs_project_id ON firebase_configs(project_id);

-- ── API Keys ──────────────────────────────────────────────────
CREATE TABLE api_keys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(64) NOT NULL,
  key_hash       VARCHAR(64) NOT NULL UNIQUE,
  key_prefix     VARCHAR(16) NOT NULL,
  rate_limit     INTEGER DEFAULT 1000,
  request_count  BIGINT DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,
  last_used_at   TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- ── Logs ─────────────────────────────────────────────────────
CREATE TABLE logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level          VARCHAR(5) NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
  type           VARCHAR(32) NOT NULL,
  message        TEXT NOT NULL,
  details        JSONB,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  username       VARCHAR(32),
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address     VARCHAR(45),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- ── Sessions (optional — for blocklist support) ───────────────
CREATE TABLE session_blocklist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocklist_token ON session_blocklist(token_hash);
CREATE INDEX idx_blocklist_expires ON session_blocklist(expires_at);

-- ── System Settings ───────────────────────────────────────────
CREATE TABLE system_settings (
  key        VARCHAR(64) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO system_settings (key, value) VALUES
  ('panelName',            'INVINCIBLE PANEL'),
  ('sessionTimeoutHours',  '24'),
  ('otpExpirySeconds',     '120'),
  ('maxOtpAttempts',       '5'),
  ('enforce2FA',           'true'),
  ('maintenanceMode',      'false');

-- ── API Request Logs ──────────────────────────────────────────
CREATE TABLE api_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method          VARCHAR(10) NOT NULL,
  path            VARCHAR(256) NOT NULL,
  status          INTEGER NOT NULL,
  response_ms     INTEGER,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id      UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_path ON api_logs(path);
CREATE INDEX idx_api_logs_status ON api_logs(status);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);

-- ── Auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_firebase_configs_updated_at
  BEFORE UPDATE ON firebase_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-disable expired accounts (run via cron) ──────────────
-- Use Vercel Cron Jobs or pg_cron to call this periodically:
-- SELECT auto_disable_expired_accounts();

CREATE OR REPLACE FUNCTION auto_disable_expired_accounts()
RETURNS INTEGER AS $$
DECLARE disabled_count INTEGER;
BEGIN
  UPDATE users SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
  GET DIAGNOSTICS disabled_count = ROW_COUNT;
  
  INSERT INTO logs (level, type, message, details)
  VALUES ('INFO', 'system', 'Auto-disabled expired accounts',
          jsonb_build_object('count', disabled_count, 'ran_at', NOW()));
  
  RETURN disabled_count;
END;
$$ LANGUAGE plpgsql;
