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
CREATE TABLE "seed_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"seed_name" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	CONSTRAINT "seed_status_seed_name_unique" UNIQUE("seed_name")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;