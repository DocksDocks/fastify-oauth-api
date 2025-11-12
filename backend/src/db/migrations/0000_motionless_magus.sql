CREATE TYPE "public"."provider" AS ENUM('google', 'apple', 'system');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'INR');--> statement-breakpoint
CREATE TYPE "public"."date_format" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."time_format" AS ENUM('12h', '24h');--> statement-breakpoint
CREATE TYPE "public"."timezone" AS ENUM('UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	CONSTRAINT "api_keys_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "authorized_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	CONSTRAINT "authorized_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "collection_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"api_name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"fields" jsonb NOT NULL,
	"indexes" jsonb,
	"relationships" jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_definitions_name_unique" UNIQUE("name"),
	CONSTRAINT "collection_definitions_api_name_unique" UNIQUE("api_name")
);
--> statement-breakpoint
CREATE TABLE "collection_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"visible_columns" jsonb NOT NULL,
	"updated_by" serial NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_preferences_table_name_unique" UNIQUE("table_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar" text,
	"primary_provider_account_id" integer,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" "provider" NOT NULL,
	"provider_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_provider_account" UNIQUE("provider","provider_id"),
	CONSTRAINT "unique_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"timezone" timezone DEFAULT 'America/Sao_Paulo' NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"date_format" date_format DEFAULT 'MM/DD/YYYY' NOT NULL,
	"time_format" time_format DEFAULT '24h' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"compact_mode" boolean DEFAULT false NOT NULL,
	"show_avatars" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"family_id" text NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"replaced_by" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "seed_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"seed_name" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	CONSTRAINT "seed_status_seed_name_unique" UNIQUE("seed_name")
);
--> statement-breakpoint
CREATE TABLE "setup_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_setup_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorized_admins" ADD CONSTRAINT "authorized_admins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_definitions" ADD CONSTRAINT "collection_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_preferences" ADD CONSTRAINT "collection_preferences_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_definitions_name" ON "collection_definitions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_collection_definitions_api_name" ON "collection_definitions" USING btree ("api_name");--> statement-breakpoint
CREATE INDEX "idx_collection_definitions_created_by" ON "collection_definitions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_users_primary_provider_account_id" ON "users" USING btree ("primary_provider_account_id");