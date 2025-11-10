CREATE TYPE "public"."locale" AS ENUM('pt-BR', 'en');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" "locale" DEFAULT 'pt-BR' NOT NULL;