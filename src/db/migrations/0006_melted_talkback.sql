ALTER TYPE "public"."provider" ADD VALUE 'system';--> statement-breakpoint
CREATE TABLE "authorized_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	CONSTRAINT "authorized_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "authorized_admins" ADD CONSTRAINT "authorized_admins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;