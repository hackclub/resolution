-- Indexes matched to current app query paths: auth/session cleanup, review email lookup,
-- warehouse list pages, Drizzle relation loading, referrals, and admin analytics counts.

CREATE INDEX IF NOT EXISTS "user_created_at_idx" ON "user" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_lower_email_idx" ON "user" USING btree (lower("email"));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_expires_at_idx" ON "session" USING btree ("expires_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "program_season_is_active_idx" ON "program_season" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollment_status_idx" ON "program_enrollment" USING btree ("status");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "completion_completed_at_idx" ON "workshop_completion" USING btree ("completed_at") WHERE "completed_at" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ship_status_idx" ON "weekly_ship" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ship_workshop_created_at_idx" ON "weekly_ship" USING btree ("workshop_id", "created_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "referral_link_ambassador_id_idx" ON "referral_link" USING btree ("ambassador_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "warehouse_item_name_idx" ON "warehouse_item" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_created_by_created_at_idx" ON "warehouse_order" USING btree ("created_by_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_fulfillment_created_at_idx" ON "warehouse_order" USING btree ("created_at") WHERE "status" <> 'DRAFT';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "warehouse_order_template_name_idx" ON "warehouse_order_template" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_template_created_at_idx" ON "warehouse_order_template" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_template_item_template_id_idx" ON "warehouse_order_template_item" USING btree ("template_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_order_template_item_warehouse_item_id_idx" ON "warehouse_order_template_item" USING btree ("warehouse_item_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "warehouse_batch_created_by_created_at_idx" ON "warehouse_batch" USING btree ("created_by_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouse_batch_template_id_idx" ON "warehouse_batch" USING btree ("template_id");
