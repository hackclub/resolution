CREATE TYPE "public"."currency_txn_reason" AS ENUM('GRANT', 'PURCHASE', 'REFUND', 'ADJUSTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."shop_item_source" AS ENUM('CUSTOM', 'WAREHOUSE_ITEM', 'WAREHOUSE_TEMPLATE');--> statement-breakpoint
CREATE TYPE "public"."shop_order_status" AS ENUM('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELED', 'REJECTED');--> statement-breakpoint
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
	"fulfiller_notes" text,
	"fulfilled_by" text,
	"fulfilled_at" timestamp,
	"tracking_number" text,
	"cancelled_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD COLUMN "shop_order_id" text;--> statement-breakpoint
ALTER TABLE "pathway_shop" ADD CONSTRAINT "pathway_shop_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_linked_warehouse_item_id_warehouse_item_id_fk" FOREIGN KEY ("linked_warehouse_item_id") REFERENCES "public"."warehouse_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_linked_warehouse_template_id_warehouse_order_template_id_fk" FOREIGN KEY ("linked_warehouse_template_id") REFERENCES "public"."warehouse_order_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_user_id_user_id_fk" FOREIGN KEY ("tx_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("tx_pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_granted_by_user_id_fk" FOREIGN KEY ("tx_granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_item_id_shop_item_id_fk" FOREIGN KEY ("shop_item_id") REFERENCES "public"."shop_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_fulfilled_by_user_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_order" ADD CONSTRAINT "warehouse_order_shop_order_id_shop_orders_id_fk" FOREIGN KEY ("shop_order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Seed one disabled pathway_shop row per existing pathway so the ambassador
-- shop pages don't 404 and shop_item / shop_orders / currency_transactions
-- FK lookups can succeed. Ambassadors flip is_enabled when ready.
INSERT INTO "pathway_shop" ("id", "pathway", "is_enabled") VALUES
  ('seed_pathway_shop_python', 'PYTHON', false),
  ('seed_pathway_shop_rust', 'RUST', false),
  ('seed_pathway_shop_game_dev', 'GAME_DEV', false),
  ('seed_pathway_shop_hardware', 'HARDWARE', false),
  ('seed_pathway_shop_design', 'DESIGN', false),
  ('seed_pathway_shop_general_coding', 'GENERAL_CODING', false)
ON CONFLICT ("pathway") DO NOTHING;
