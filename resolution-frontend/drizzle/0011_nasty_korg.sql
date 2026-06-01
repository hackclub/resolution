CREATE TYPE "public"."warehouse_batch_status" AS ENUM('AWAITING_MAPPING', 'MAPPED', 'PROCESSED');--> statement-breakpoint
CREATE TYPE "public"."warehouse_order_status" AS ENUM('DRAFT', 'ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "submission_closure_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"season_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"week_number" integer NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_batch" (
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
CREATE TABLE "warehouse_batch_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_item" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"sizing" text,
	"package_type" text DEFAULT 'box' NOT NULL,
	"length_in" real NOT NULL,
	"width_in" real NOT NULL,
	"height_in" real NOT NULL,
	"weight_grams" real NOT NULL,
	"cost_cents" integer NOT NULL,
	"hs_code" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_item_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "warehouse_order" (
	"id" text PRIMARY KEY NOT NULL,
	"fulfillment_id" integer GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_order_fulfillment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_by_id" text NOT NULL,
	"batch_id" text,
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
	"estimated_duties_cents" integer,
	"estimated_service_name" text,
	"estimated_service_code" text,
	"estimated_package_type" text,
	"estimated_total_length_in" real,
	"estimated_total_width_in" real,
	"estimated_total_height_in" real,
	"estimated_total_weight_grams" real,
	"packaging_category" text,
	"packaging_label" text,
	"packaging_length_in" real,
	"packaging_width_in" real,
	"packaging_height_in" real,
	"packaging_subject_to_change" boolean DEFAULT false NOT NULL,
	"tracking_number" text,
	"label_url" text,
	"shipping_method" text,
	"billing_status" text DEFAULT 'PENDING' NOT NULL,
	"billing_failure_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_order_fulfillment_id_unique" UNIQUE("fulfillment_id")
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
CREATE TABLE "warehouse_order_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_order_template" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_id" text NOT NULL,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_order_template_item" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"warehouse_item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_batch" ADD CONSTRAINT "warehouse_batch_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_batch" ADD CONSTRAINT "warehouse_batch_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_batch_tag" ADD CONSTRAINT "warehouse_batch_tag_batch_id_warehouse_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."warehouse_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_item" ADD CONSTRAINT "warehouse_item_category_id_warehouse_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."warehouse_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_order_id_warehouse_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."warehouse_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_item" ADD CONSTRAINT "warehouse_order_item_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_tag" ADD CONSTRAINT "warehouse_order_tag_order_id_warehouse_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."warehouse_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_template" ADD CONSTRAINT "warehouse_order_template_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_template_item" ADD CONSTRAINT "warehouse_order_template_item_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order_template_item" ADD CONSTRAINT "warehouse_order_template_item_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "submission_exception_unique_idx" ON "submission_closure_exception" USING btree ("user_id","season_id","pathway","week_number") WHERE "submission_closure_exception"."is_active" = true;--> statement-breakpoint
CREATE INDEX "submission_exception_lookup_idx" ON "submission_closure_exception" USING btree ("season_id","pathway","week_number");--> statement-breakpoint
CREATE INDEX "submission_exception_user_idx" ON "submission_closure_exception" USING btree ("user_id","season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_batch_tag_unique_idx" ON "warehouse_batch_tag" USING btree ("batch_id","tag");--> statement-breakpoint
CREATE INDEX "warehouse_order_item_order_id_idx" ON "warehouse_order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "warehouse_order_item_warehouse_item_id_idx" ON "warehouse_order_item" USING btree ("warehouse_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_order_tag_unique_idx" ON "warehouse_order_tag" USING btree ("order_id","tag");--> statement-breakpoint
CREATE INDEX "warehouse_order_tag_tag_idx" ON "warehouse_order_tag" USING btree ("tag");