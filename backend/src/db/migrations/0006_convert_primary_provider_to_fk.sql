-- Migration: Convert primaryProvider from enum to foreign key reference
-- This migration:
-- 1. Adds new primary_provider_account_id column (FK to provider_accounts)
-- 2. Migrates data from primary_provider enum to primary_provider_account_id
-- 3. Drops legacy fields: provider, provider_id, primary_provider

-- Step 1: Add new column (nullable integer)
ALTER TABLE "users" ADD COLUMN "primary_provider_account_id" integer;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS "idx_users_primary_provider_account_id" ON "users" ("primary_provider_account_id");

-- Step 3: Populate primary_provider_account_id from existing primary_provider enum
-- Match users with their provider_accounts based on the primary_provider value
UPDATE "users" u
SET "primary_provider_account_id" = pa.id
FROM "provider_accounts" pa
WHERE pa.user_id = u.id
  AND pa.provider = u.primary_provider
  AND u.primary_provider IS NOT NULL;

-- Step 4: Add foreign key constraint (with SET NULL on delete)
ALTER TABLE "users"
ADD CONSTRAINT "users_primary_provider_account_id_provider_accounts_id_fk"
FOREIGN KEY ("primary_provider_account_id")
REFERENCES "provider_accounts"("id")
ON DELETE set null
ON UPDATE no action;

-- Step 5: Verification - ensure all users with provider accounts have primary_provider_account_id set
DO $$
DECLARE
  users_without_primary INTEGER;
  users_with_providers INTEGER;
BEGIN
  -- Count users with provider accounts but no primary_provider_account_id
  SELECT COUNT(*) INTO users_without_primary
  FROM "users" u
  WHERE EXISTS (
    SELECT 1 FROM "provider_accounts" pa WHERE pa.user_id = u.id
  )
  AND primary_provider_account_id IS NULL;

  -- Count users with at least one provider account
  SELECT COUNT(DISTINCT user_id) INTO users_with_providers
  FROM "provider_accounts";

  IF users_without_primary > 0 THEN
    RAISE WARNING 'Found % users with providers but no primary_provider_account_id', users_without_primary;
  ELSE
    RAISE NOTICE 'Migration successful: All % users with providers have primary_provider_account_id set', users_with_providers;
  END IF;
END $$;

-- Step 6: Drop legacy columns
-- These columns are no longer needed as all provider data is now in provider_accounts table
ALTER TABLE "users" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "users" DROP COLUMN IF EXISTS "provider_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "primary_provider";

-- Note: The provider enum type is still used by provider_accounts table, so we DO NOT drop it
