CREATE TYPE "public"."provider" AS ENUM('google', 'apple');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar" varchar(512),
	"provider" "provider" NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
