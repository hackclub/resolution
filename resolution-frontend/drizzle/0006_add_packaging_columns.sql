ALTER TABLE "warehouse_order" ADD COLUMN "packaging_category" text;
ALTER TABLE "warehouse_order" ADD COLUMN "packaging_label" text;
ALTER TABLE "warehouse_order" ADD COLUMN "packaging_length_in" real;
ALTER TABLE "warehouse_order" ADD COLUMN "packaging_width_in" real;
ALTER TABLE "warehouse_order" ADD COLUMN "packaging_height_in" real;
ALTER TABLE "warehouse_order" ADD COLUMN "packaging_subject_to_change" boolean DEFAULT false NOT NULL;
