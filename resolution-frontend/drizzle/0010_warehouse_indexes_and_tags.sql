-- Backfill DDL that was missing from prior migrations on warehouse-dev:
-- warehouse_order.fulfillment_id (generated identity), estimated_duties_cents,
-- estimated_service_code, warehouse_order_tag table, and indexes.

-- Add fulfillment_id as generated identity (used for human-readable order numbers)
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "fulfillment_id" integer GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_order_fulfillment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_fulfillment_id_unique" UNIQUE("fulfillment_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Added estimated_duties_cents and estimated_service_code to warehouse_order
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "estimated_duties_cents" integer;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "estimated_service_code" text;
--> statement-breakpoint

-- Indexes on warehouse_order_item
CREATE INDEX IF NOT EXISTS "warehouse_order_item_order_id_idx" ON "warehouse_order_item" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_item_warehouse_item_id_idx" ON "warehouse_order_item" USING btree ("warehouse_item_id");
--> statement-breakpoint

-- Warehouse order tags for filtering
CREATE TABLE IF NOT EXISTS "warehouse_order_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_tag" ADD CONSTRAINT "warehouse_order_tag_order_id_warehouse_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."warehouse_order"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_order_tag_unique_idx" ON "warehouse_order_tag" USING btree ("order_id","tag");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_tag_tag_idx" ON "warehouse_order_tag" USING btree ("tag");
--> statement-breakpoint

-- Billing status tracking: flag orders whose HCB transfer raised so they can be reconciled manually
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "billing_status" text NOT NULL DEFAULT 'PENDING';
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "billing_failure_reason" text;
