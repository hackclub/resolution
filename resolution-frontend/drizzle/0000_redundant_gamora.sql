CREATE TYPE "public"."currency_txn_reason" AS ENUM('GRANT', 'PURCHASE', 'REFUND', 'ADJUSTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."enrollment_role" AS ENUM('PARTICIPANT', 'AMBASSADOR');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'DROPPED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."pathway" AS ENUM('PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('DRAFT', 'PENDING', 'PAID', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."ship_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."shop_item_source" AS ENUM('CUSTOM', 'WAREHOUSE_ITEM', 'WAREHOUSE_TEMPLATE');--> statement-breakpoint
CREATE TYPE "public"."shop_order_status" AS ENUM('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."warehouse_batch_status" AS ENUM('AWAITING_MAPPING', 'MAPPED', 'PROCESSED');--> statement-breakpoint
CREATE TYPE "public"."warehouse_order_status" AS ENUM('DRAFT', 'ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "ambassador_pathway" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambassador_payout" (
	"id" text PRIMARY KEY NOT NULL,
	"ambassador_id" text NOT NULL,
	"season_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payout_status" DEFAULT 'DRAFT' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambassador_payout_item" (
	"id" text PRIMARY KEY NOT NULL,
	"payout_id" text NOT NULL,
	"workshop_id" text NOT NULL,
	"completion_count" integer NOT NULL,
	"rate_cents_per_completion" integer NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathway_shop" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"currency_name" text DEFAULT 'wish' NOT NULL,
	"currency_name_plural" text DEFAULT 'wishes' NOT NULL,
	"last_edited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pathway_shop_pathway_unique" UNIQUE("pathway")
);
--> statement-breakpoint
CREATE TABLE "pathway_week_content" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"week_number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"prize_image_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_submissions_open" boolean DEFAULT true NOT NULL,
	"last_edited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"season_id" text NOT NULL,
	"role" "enrollment_role" NOT NULL,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"starting_week" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_season" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"signup_opens_at" timestamp NOT NULL,
	"signup_closes_at" timestamp NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"total_weeks" integer DEFAULT 8 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "program_season_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "referral_link" (
	"id" text PRIMARY KEY NOT NULL,
	"ambassador_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_link_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_signup" (
	"id" text PRIMARY KEY NOT NULL,
	"referral_link_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_pathway" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_item" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"item_image_url" text,
	"item_price" integer NOT NULL,
	"item_stock" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"source_type" "shop_item_source" DEFAULT 'CUSTOM' NOT NULL,
	"linked_warehouse_item_id" text,
	"linked_warehouse_template_id" text,
	"last_edited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"pathway" "pathway" NOT NULL,
	"order_status" "shop_order_status" DEFAULT 'PENDING' NOT NULL,
	"amount" integer NOT NULL,
	"shop_item_id" text,
	"item_price_snapshot" integer NOT NULL,
	"item_name_snapshot" text NOT NULL,
	"shipping_address" jsonb,
	"phone" text,
	"user_notes" text,
	"fufiller_notes" text,
	"fufilled_by" text,
	"fufilled_at" timestamp,
	"cancelled_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tx_user_id" text,
	"tx_pathway" "pathway" NOT NULL,
	"tx_amount" integer NOT NULL,
	"tx_reason" "currency_txn_reason" NOT NULL,
	"tx_note" text,
	"tx_granted_by" text,
	"tx_ref_type" text,
	"tx_ref_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"hack_club_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"slack_id" text,
	"verification_status" text,
	"ysws_eligible" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_hack_club_id_unique" UNIQUE("hack_club_id")
);
--> statement-breakpoint
CREATE TABLE "user_pathway" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "weekly_ship" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"season_id" text NOT NULL,
	"workshop_id" text,
	"week_number" integer NOT NULL,
	"goal_text" text NOT NULL,
	"status" "ship_status" DEFAULT 'PLANNED' NOT NULL,
	"proof_url" text,
	"notes" text,
	"shipped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"season_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"estimated_hours" integer NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"starts" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"avg_completion_mins" real,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workshop_analytics_workshop_id_unique" UNIQUE("workshop_id")
);
--> statement-breakpoint
CREATE TABLE "workshop_completion" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"season_id" text NOT NULL,
	"project_url" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ambassador_pathway" ADD CONSTRAINT "ambassador_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_pathway" ADD CONSTRAINT "ambassador_pathway_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_payout" ADD CONSTRAINT "ambassador_payout_ambassador_id_user_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_payout" ADD CONSTRAINT "ambassador_payout_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_payout_item" ADD CONSTRAINT "ambassador_payout_item_payout_id_ambassador_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."ambassador_payout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_payout_item" ADD CONSTRAINT "ambassador_payout_item_workshop_id_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathway_shop" ADD CONSTRAINT "pathway_shop_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathway_week_content" ADD CONSTRAINT "pathway_week_content_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_enrollment" ADD CONSTRAINT "program_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_enrollment" ADD CONSTRAINT "program_enrollment_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_link" ADD CONSTRAINT "referral_link_ambassador_id_user_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signup" ADD CONSTRAINT "referral_signup_referral_link_id_referral_link_id_fk" FOREIGN KEY ("referral_link_id") REFERENCES "public"."referral_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signup" ADD CONSTRAINT "referral_signup_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ADD CONSTRAINT "reviewer_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ADD CONSTRAINT "reviewer_pathway_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_linked_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("linked_warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_linked_warehouse_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("linked_warehouse_template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_item_id_shop_item_id_fk" FOREIGN KEY ("shop_item_id") REFERENCES "public"."shop_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_fufilled_by_user_id_fk" FOREIGN KEY ("fufilled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_user_id_user_id_fk" FOREIGN KEY ("tx_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("tx_pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_granted_by_user_id_fk" FOREIGN KEY ("tx_granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pathway" ADD CONSTRAINT "user_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "weekly_ship" ADD CONSTRAINT "weekly_ship_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_ship" ADD CONSTRAINT "weekly_ship_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_ship" ADD CONSTRAINT "weekly_ship_workshop_id_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop" ADD CONSTRAINT "workshop_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop" ADD CONSTRAINT "workshop_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_analytics" ADD CONSTRAINT "workshop_analytics_workshop_id_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_completion" ADD CONSTRAINT "workshop_completion_workshop_id_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_completion" ADD CONSTRAINT "workshop_completion_participant_id_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_completion" ADD CONSTRAINT "workshop_completion_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ambassador_pathway_unique_idx" ON "ambassador_pathway" USING btree ("user_id","pathway");--> statement-breakpoint
CREATE UNIQUE INDEX "pathway_week_content_unique_idx" ON "pathway_week_content" USING btree ("pathway","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_user_season_role_idx" ON "program_enrollment" USING btree ("user_id","season_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_signup_unique_idx" ON "referral_signup" USING btree ("referral_link_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviewer_pathway_unique_idx" ON "reviewer_pathway" USING btree ("user_id","pathway");--> statement-breakpoint
CREATE UNIQUE INDEX "user_pathway_unique_idx" ON "user_pathway" USING btree ("user_id","pathway");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_batch_tag_unique_idx" ON "warehouse_batch_tag" USING btree ("batch_id","tag");--> statement-breakpoint
CREATE INDEX "warehouse_order_item_order_id_idx" ON "warehouse_order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "warehouse_order_item_warehouse_item_id_idx" ON "warehouse_order_item" USING btree ("warehouse_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_order_tag_unique_idx" ON "warehouse_order_tag" USING btree ("order_id","tag");--> statement-breakpoint
CREATE INDEX "warehouse_order_tag_tag_idx" ON "warehouse_order_tag" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "ship_user_season_week_idx" ON "weekly_ship" USING btree ("user_id","season_id","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "completion_workshop_participant_season_idx" ON "workshop_completion" USING btree ("workshop_id","participant_id","season_id");