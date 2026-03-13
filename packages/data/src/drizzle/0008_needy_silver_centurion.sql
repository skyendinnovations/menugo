CREATE TABLE "shift_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" integer NOT NULL,
	"clocked_in_at" timestamp NOT NULL,
	"clocked_out_at" timestamp,
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shift_logs_user_restaurant" ON "shift_logs" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_shift_logs_restaurant_date" ON "shift_logs" USING btree ("restaurant_id","clocked_in_at");