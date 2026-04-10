ALTER TABLE "warehouse_item" ADD COLUMN "package_type" text DEFAULT 'box' NOT NULL;
--> statement-breakpoint
CREATE TYPE "warehouse_order_status" AS ENUM ('DRAFT', 'ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELLED');
--> statement-breakpoint
CREATE TABLE "warehouse_order" (
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
CREATE TABLE "warehouse_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"warehouse_item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sizing_choice" text
);
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_order_id_warehouse_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."warehouse_order"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE restrict ON UPDATE no action;
