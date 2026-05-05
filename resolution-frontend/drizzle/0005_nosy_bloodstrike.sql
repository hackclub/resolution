CREATE TYPE "public"."currency_txn_reason" AS ENUM('GRANT', 'PURCHASE', 'REFUND', 'ADJUSTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."shop_item_type" AS ENUM('PHYSICAL', 'DIGITAL');--> statement-breakpoint
CREATE TYPE "public"."shop_order_status" AS ENUM('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELED');--> statement-breakpoint
CREATE TABLE "fufiller_pathway" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text NOT NULL
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
CREATE TABLE "shop_item" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"item_url" text,
	"item_price" integer NOT NULL,
	"item_stock" integer,
	"item_type" "shop_item_type" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_edited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"pathway" "pathway" NOT NULL,
	"order_stauts" "shop_order_status" DEFAULT 'PENDING' NOT NULL,
	"amount" integer NOT NULL,
	"shop_item_id" text,
	"item_price_snapshot" integer NOT NULL,
	"item_type_enum" "shop_item_type",
	"item_name_snapshot" text NOT NULL,
	"shipping_address" jsonb,
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
ALTER TABLE "fufiller_pathway" ADD CONSTRAINT "fufiller_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fufiller_pathway" ADD CONSTRAINT "fufiller_pathway_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathway_shop" ADD CONSTRAINT "pathway_shop_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_item" ADD CONSTRAINT "shop_item_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_item_id_shop_item_id_fk" FOREIGN KEY ("shop_item_id") REFERENCES "public"."shop_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_fufilled_by_user_id_fk" FOREIGN KEY ("fufilled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_user_id_user_id_fk" FOREIGN KEY ("tx_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_pathway_pathway_shop_pathway_fk" FOREIGN KEY ("tx_pathway") REFERENCES "public"."pathway_shop"("pathway") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_tx_granted_by_user_id_fk" FOREIGN KEY ("tx_granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fufiller_pathway_unique_idx" ON "fufiller_pathway" USING btree ("user_id","pathway");