-- Migration: Add setup_status table
-- Purpose: Track first-time setup completion for browser-based setup wizard

-- Step 1: Create setup_status table
CREATE TABLE IF NOT EXISTS "setup_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_setup_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);

-- Step 2: Insert initial record (setup not complete)
INSERT INTO "setup_status" ("is_setup_complete")
VALUES (false)
ON CONFLICT DO NOTHING;

-- Step 3: For existing installations with users, mark setup as complete
UPDATE "setup_status"
SET "is_setup_complete" = true, "completed_at" = NOW()
WHERE (SELECT COUNT(*) FROM "users") > 0;
