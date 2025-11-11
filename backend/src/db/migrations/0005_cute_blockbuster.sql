ALTER TABLE "user_preferences" ALTER COLUMN "locale" SET DEFAULT 'pt-BR';--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "timezone" SET DEFAULT 'America/Sao_Paulo';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "locale";--> statement-breakpoint
DROP TYPE "public"."locale";