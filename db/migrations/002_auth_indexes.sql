CREATE INDEX IF NOT EXISTS idx_users_locked_until
  ON users (locked_until)
  WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_expires_at
  ON user_sessions (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON user_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_user_type
  ON user_auth_tokens (user_id, type);

CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_type_expires_at
  ON user_auth_tokens (type, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_expires_at
  ON user_auth_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_active_lookup
  ON user_auth_tokens (user_id, type, expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_user_state_updated_at
  ON app_user_state (updated_at DESC);
