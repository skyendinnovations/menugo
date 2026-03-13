CREATE TYPE "public"."audit_action" AS ENUM('role_created', 'role_updated', 'role_deleted', 'permission_changed', 'member_invited', 'member_removed', 'order_status_changed', 'order_voided', 'order_claimed', 'notification_resent', 'session_closed', 'session_force_closed', 'table_blocked', 'table_unblocked', 'table_force_released', 'menu_availability_changed', 'stock_updated', 'workflow_changed', 'override', 'restaurant_suspended', 'restaurant_activated', 'user_banned', 'user_unbanned');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('role', 'member', 'invitation', 'order', 'session', 'table', 'menu_item', 'menu_variant', 'restaurant', 'workflow', 'user');--> statement-breakpoint
CREATE TYPE "public"."staff_availability_status" AS ENUM('clocked_in', 'clocked_out');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"actor_user_id" text,
	"action" "audit_action" NOT NULL,
	"entity_type" "audit_entity" NOT NULL,
	"entity_id" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"token" text NOT NULL,
	"device_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_device_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"order_id" integer,
	"event_type" text NOT NULL,
	"recipient_role_ids" jsonb DEFAULT '[]'::jsonb,
	"recipient_user_ids" jsonb DEFAULT '[]'::jsonb,
	"fcm_success_count" integer DEFAULT 0,
	"fcm_failure_count" integer DEFAULT 0,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" integer NOT NULL,
	"status" "staff_availability_status" DEFAULT 'clocked_out' NOT NULL,
	"active_order_count" integer DEFAULT 0 NOT NULL,
	"clocked_in_at" timestamp,
	"clocked_out_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_availability_user_id_restaurant_id_unique" UNIQUE("user_id","restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"from_state" "order_status" NOT NULL,
	"to_state" "order_status" NOT NULL,
	"required_permission" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "restaurant_workflows_restaurant_id_from_state_to_state_unique" UNIQUE("restaurant_id","from_state","to_state")
);
--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD COLUMN "stock_count" integer;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD COLUMN "is_sold_out" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "stock_count" integer;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_sold_out" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claimed_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "workflow_mode" text DEFAULT 'full_service' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "is_demo_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "helper_blocked_by" text;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "helper_blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_workflows" ADD CONSTRAINT "restaurant_workflows_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_restaurant" ON "audit_logs" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("restaurant_id","action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("restaurant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_customer_device_tokens_device" ON "customer_device_tokens" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_notification_logs_restaurant" ON "notification_logs" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_notification_logs_order" ON "notification_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_notification_logs_sent_at" ON "notification_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_staff_availability_restaurant" ON "staff_availability" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_staff_availability_status" ON "staff_availability" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "idx_workflows_restaurant" ON "restaurant_workflows" USING btree ("restaurant_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_helper_blocked_by_user_id_fk" FOREIGN KEY ("helper_blocked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;