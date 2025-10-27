-- Create new enums for workout session tracking
CREATE TYPE "public"."workout_log_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('live', 'manual');--> statement-breakpoint
CREATE TYPE "public"."set_type" AS ENUM('warmup', 'prep', 'working');--> statement-breakpoint

-- Add new columns to workout_logs table
ALTER TABLE "workout_logs" ADD COLUMN "status" "workout_log_status" DEFAULT 'in_progress' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "session_type" "session_type" DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint

-- Add new columns to workout_exercises table (set type configuration)
ALTER TABLE "workout_exercises" ADD COLUMN "warmup_sets_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "warmup_rest_seconds" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "prep_sets_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "prep_rest_seconds" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "working_sets_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "working_rest_seconds" integer;--> statement-breakpoint

-- Drop old deprecated columns from workout_exercises
ALTER TABLE "workout_exercises" DROP COLUMN "sets";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "rest_seconds";--> statement-breakpoint

-- Add new columns to set_logs table
ALTER TABLE "set_logs" ADD COLUMN "set_type" "set_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "set_logs" ADD COLUMN "set_number_within_type" integer NOT NULL;--> statement-breakpoint

-- Drop old deprecated column from set_logs
ALTER TABLE "set_logs" DROP COLUMN "is_warmup";
