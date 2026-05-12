ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "tracking_number" text;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "label_url" text;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "shipping_method" text;
