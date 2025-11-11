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
ALTER TABLE "users" ADD COLUMN "primary_provider" "provider";--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;