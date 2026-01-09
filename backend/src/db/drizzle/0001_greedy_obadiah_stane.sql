CREATE TYPE "public"."table_count_range" AS ENUM('under_10', '10_to_20', '20_to_40', '40_to_50');--> statement-breakpoint
ALTER TYPE "public"."invitation_status" ADD VALUE 'rejected' BEFORE 'expired';--> statement-breakpoint
CREATE TABLE "restaurant_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" integer NOT NULL,
	"restaurant_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "restaurant_invitations" DROP CONSTRAINT "restaurant_invitations_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "restaurant_invitations" ADD COLUMN "role_ids" integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_invitations" ADD COLUMN "accepted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "restaurant_invitations" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "table_count_range" "table_count_range";--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "workers_count" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "seating_capacity" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "operating_hours" jsonb;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_roles_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_restaurant_idx" ON "user_roles" USING btree ("restaurant_id");--> statement-breakpoint
ALTER TABLE "restaurant_invitations" ADD CONSTRAINT "restaurant_invitations_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "restaurant_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role_id";--> statement-breakpoint
ALTER TABLE "restaurant_invitations" DROP COLUMN "role_id";