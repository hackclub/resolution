ALTER TYPE "public"."shop_order_status" ADD VALUE 'REJECTED';--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN "shop_order_id" text;--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_shop_order_id_shop_orders_id_fk" FOREIGN KEY ("shop_order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;