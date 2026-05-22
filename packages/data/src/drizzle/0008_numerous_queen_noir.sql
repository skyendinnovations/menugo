CREATE TABLE "kitchen_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"kitchen_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "kitchen_members_kitchen_id_user_id_unique" UNIQUE("kitchen_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "kitchen_menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"kitchen_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "kitchen_menu_items_kitchen_id_menu_item_id_unique" UNIQUE("kitchen_id","menu_item_id")
);
--> statement-breakpoint
CREATE TABLE "kitchens" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "kitchen_members" ADD CONSTRAINT "kitchen_members_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_members" ADD CONSTRAINT "kitchen_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_menu_items" ADD CONSTRAINT "kitchen_menu_items_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_menu_items" ADD CONSTRAINT "kitchen_menu_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;