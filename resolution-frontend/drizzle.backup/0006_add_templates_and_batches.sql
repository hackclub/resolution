-- Order Templates
CREATE TABLE IF NOT EXISTS "warehouse_order_template" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_id" text NOT NULL,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_order_template_item" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"warehouse_item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_template" ADD CONSTRAINT "warehouse_order_template_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_template_item" ADD CONSTRAINT "warehouse_order_template_item_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_order_template_item" ADD CONSTRAINT "warehouse_order_template_item_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- Batches
DO $$ BEGIN
	CREATE TYPE "warehouse_batch_status" AS ENUM ('AWAITING_MAPPING', 'MAPPED', 'PROCESSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_id" text NOT NULL,
	"template_id" text NOT NULL,
	"title" text,
	"status" "warehouse_batch_status" DEFAULT 'AWAITING_MAPPING' NOT NULL,
	"csv_data" text NOT NULL,
	"field_mapping" text,
	"address_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_batch_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_batch" ADD CONSTRAINT "warehouse_batch_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_batch" ADD CONSTRAINT "warehouse_batch_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "warehouse_batch_tag" ADD CONSTRAINT "warehouse_batch_tag_batch_id_warehouse_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."warehouse_batch"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_batch_tag_unique_idx" ON "warehouse_batch_tag" USING btree ("batch_id","tag");
--> statement-breakpoint
-- Add batch_id to warehouse_order
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "batch_id" text;
