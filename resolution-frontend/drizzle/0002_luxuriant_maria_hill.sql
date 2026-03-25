CREATE TABLE "reviewer_pathway" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambassador_pathway" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pathway_week_content" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "referral_link" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_pathway" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workshop" ALTER COLUMN "pathway" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."pathway";--> statement-breakpoint
CREATE TYPE "public"."pathway" AS ENUM('PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING');--> statement-breakpoint
ALTER TABLE "ambassador_pathway" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "pathway_week_content" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "referral_link" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "user_pathway" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "workshop" ALTER COLUMN "pathway" SET DATA TYPE "public"."pathway" USING "pathway"::"public"."pathway";--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ADD CONSTRAINT "reviewer_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_pathway" ADD CONSTRAINT "reviewer_pathway_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviewer_pathway_unique_idx" ON "reviewer_pathway" USING btree ("user_id","pathway");