CREATE TABLE "ingresse_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingresse_user_id" text NOT NULL,
	"token" text NOT NULL,
	"auth_token" text,
	"name" text,
	"email" text,
	"birthdate" date,
	"nationality" varchar(3),
	"gender" varchar(1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresse_users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ingresse_users_ingresse_user_id_unique" UNIQUE("ingresse_user_id")
);
--> statement-breakpoint
CREATE TABLE "ingresse_user_phones" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingresse_user_id" integer NOT NULL,
	"ddi" integer NOT NULL,
	"number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingresse_user_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingresse_user_id" integer NOT NULL,
	"street" text,
	"number" text,
	"complement" text,
	"district" text,
	"zipcode" text,
	"city" text,
	"state" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingresse_user_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingresse_user_id" integer NOT NULL,
	"type" integer NOT NULL,
	"number_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingresse_users" ADD CONSTRAINT "ingresse_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresse_user_phones" ADD CONSTRAINT "ingresse_user_phones_ingresse_user_id_ingresse_users_id_fk" FOREIGN KEY ("ingresse_user_id") REFERENCES "public"."ingresse_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresse_user_addresses" ADD CONSTRAINT "ingresse_user_addresses_ingresse_user_id_ingresse_users_id_fk" FOREIGN KEY ("ingresse_user_id") REFERENCES "public"."ingresse_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresse_user_documents" ADD CONSTRAINT "ingresse_user_documents_ingresse_user_id_ingresse_users_id_fk" FOREIGN KEY ("ingresse_user_id") REFERENCES "public"."ingresse_users"("id") ON DELETE cascade ON UPDATE no action;