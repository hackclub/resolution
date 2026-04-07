-- Pathway shops feature
-- Adds per-pathway currency balance, shop catalog, and shop orders
-- (with optional link to warehouse orders for fulfillment).

CREATE TYPE "shop_order_status" AS ENUM ('PENDING', 'FULFILLED', 'SENT_TO_WAREHOUSE', 'CANCELED');

ALTER TABLE "user_pathway" ADD COLUMN "balance" integer NOT NULL DEFAULT 0;

CREATE TABLE "pathway_shop" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"currency_name" text NOT NULL DEFAULT 'Coins',
	"currency_icon_url" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "pathway_shop_pathway_unique" UNIQUE("pathway")
);

CREATE TABLE "shop_item" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"image_url" text,
	"cost_currency" integer NOT NULL,
	"warehouse_item_id" text REFERENCES "warehouse_item"("id") ON DELETE SET NULL,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "shop_item_pathway_idx" ON "shop_item" ("pathway");

CREATE TABLE "shop_order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"pathway" "pathway" NOT NULL,
	"status" "shop_order_status" NOT NULL DEFAULT 'PENDING',
	"total_currency" integer NOT NULL,
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
	"tracking_number" text,
	"carrier" text,
	"warehouse_order_id" text REFERENCES "warehouse_order"("id") ON DELETE SET NULL,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"fulfilled_at" timestamp
);
CREATE INDEX "shop_order_user_idx" ON "shop_order" ("user_id");
CREATE INDEX "shop_order_pathway_status_idx" ON "shop_order" ("pathway", "status");

CREATE TABLE "shop_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL REFERENCES "shop_order"("id") ON DELETE CASCADE,
	"shop_item_id" text NOT NULL REFERENCES "shop_item"("id") ON DELETE RESTRICT,
	"quantity" integer NOT NULL DEFAULT 1,
	"unit_cost_currency" integer NOT NULL
);
