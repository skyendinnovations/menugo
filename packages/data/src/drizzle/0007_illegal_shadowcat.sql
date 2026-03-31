CREATE TABLE "customer_device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"token" text NOT NULL,
	"device_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_device_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "customer_device_tokens_device_id_token_unique" UNIQUE("device_id","token")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "accepted_by_kitchen" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "accepted_by_waiter" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "accepted_by_kitchen_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "accepted_by_waiter_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_customer_device_tokens_device" ON "customer_device_tokens" USING btree ("device_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_accepted_by_kitchen_user_id_fk" FOREIGN KEY ("accepted_by_kitchen") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_accepted_by_waiter_user_id_fk" FOREIGN KEY ("accepted_by_waiter") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;