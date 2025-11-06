-- Data Migration: Move existing user provider data to provider_accounts table
-- This migration safely migrates all existing users to the new multi-provider structure

-- Step 1: Insert existing provider data into provider_accounts table
-- For each user, create a provider_account entry using their existing provider/providerId
INSERT INTO provider_accounts (user_id, provider, provider_id, email, name, avatar, linked_at)
SELECT
  id as user_id,
  provider,
  provider_id,
  email,
  name,
  avatar,
  created_at as linked_at  -- Use user's creation date as the link date
FROM users
WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

-- Step 2: Set primaryProvider for all existing users
-- This will be the provider they originally signed up with
UPDATE users
SET primary_provider = provider
WHERE primary_provider IS NULL;

-- Step 3: Verify migration (optional - can be commented out in production)
-- This will raise an error if any user doesn't have a corresponding provider_account
DO $$
DECLARE
  orphaned_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_users
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM provider_accounts pa
    WHERE pa.user_id = u.id
  );

  IF orphaned_users > 0 THEN
    RAISE WARNING 'Found % users without provider accounts. Please investigate.', orphaned_users;
  ELSE
    RAISE NOTICE 'Migration successful: All % users have provider accounts', (SELECT COUNT(*) FROM users);
  END IF;
END $$;
