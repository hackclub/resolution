-- Create warehouse_category (was never in a migration on this branch)
CREATE TABLE IF NOT EXISTS "warehouse_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create warehouse_item (was never in a migration on this branch)
CREATE TABLE IF NOT EXISTS "warehouse_item" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"sizing" text,
	"length_in" real NOT NULL,
	"width_in" real NOT NULL,
	"height_in" real NOT NULL,
	"weight_grams" real NOT NULL,
	"cost_cents" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_item_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
-- FK from warehouse_item.category_id → warehouse_category.id (set null on delete)
DO $$ BEGIN
	ALTER TABLE "warehouse_item" ADD CONSTRAINT "warehouse_item_category_id_warehouse_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."warehouse_category"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "warehouse_item" ADD COLUMN IF NOT EXISTS "package_type" text DEFAULT 'box' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "warehouse_order_status" AS ENUM ('DRAFT', 'ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_order" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_id" text NOT NULL,
	"status" "warehouse_order_status" DEFAULT 'DRAFT' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"state_province" text NOT NULL,
	"postal_code" text,
	"country" text NOT NULL,
	"estimated_shipping_cents" integer,
	"estimated_service_name" text,
	"estimated_package_type" text,
	"estimated_total_length_in" real,
	"estimated_total_width_in" real,
	"estimated_total_height_in" real,
	"estimated_total_weight_grams" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"warehouse_item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sizing_choice" text
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_order_id_warehouse_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."warehouse_order"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
