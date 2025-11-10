-- Create collection_preferences table for storing admin-configurable column visibility
CREATE TABLE IF NOT EXISTS "collection_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "table_name" text NOT NULL UNIQUE,
  "visible_columns" jsonb NOT NULL,
  "updated_by" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint to users table
ALTER TABLE "collection_preferences"
ADD CONSTRAINT "collection_preferences_updated_by_users_id_fk"
FOREIGN KEY ("updated_by")
REFERENCES "users"("id")
ON DELETE cascade
ON UPDATE no action;

-- Create index for faster lookups by table_name
CREATE INDEX IF NOT EXISTS "idx_collection_preferences_table_name" ON "collection_preferences" ("table_name");
