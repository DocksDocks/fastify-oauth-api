-- Add performance indexes for refresh_tokens table
-- These indexes optimize token lookup, revocation, and cleanup operations

-- Index for token lookup during refresh (most common operation)
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token" ON "refresh_tokens"("token");

-- Index for finding user's active tokens (session list)
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_active"
  ON "refresh_tokens"("user_id", "is_revoked")
  WHERE "is_revoked" = false;

-- Index for token family operations (reuse detection)
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family" ON "refresh_tokens"("family_id");

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_cleanup"
  ON "refresh_tokens"("expires_at", "is_used")
  WHERE "is_used" = true;
