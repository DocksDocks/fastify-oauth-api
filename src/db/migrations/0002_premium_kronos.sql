ALTER TABLE "exercises" ADD COLUMN "code" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_code_unique" UNIQUE("code");