ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_category" text;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_label" text;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_length_in" real;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_width_in" real;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_height_in" real;
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN IF NOT EXISTS "packaging_subject_to_change" boolean DEFAULT false NOT NULL;
