CREATE TYPE "public"."entity_type" AS ENUM('restaurant', 'menu_item', 'user');--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"original_name" text,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"purpose" text DEFAULT 'image',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;