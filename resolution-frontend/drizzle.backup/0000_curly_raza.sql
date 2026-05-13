CREATE TYPE "public"."difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."enrollment_role" AS ENUM('PARTICIPANT', 'AMBASSADOR');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'DROPPED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."pathway" AS ENUM('PYTHON', 'WEB_DEV', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('DRAFT', 'PENDING', 'PAID', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."ship_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED');--> statement-breakpoint
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
CREATE TABLE "pathway_week_content" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway" "pathway" NOT NULL,
	"week_number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL
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
ALTER TABLE "pathway_week_content" ADD CONSTRAINT "pathway_week_content_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_enrollment" ADD CONSTRAINT "program_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_enrollment" ADD CONSTRAINT "program_enrollment_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pathway" ADD CONSTRAINT "user_pathway_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "user_pathway_unique_idx" ON "user_pathway" USING btree ("user_id","pathway");--> statement-breakpoint
CREATE INDEX "ship_user_season_week_idx" ON "weekly_ship" USING btree ("user_id","season_id","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "completion_workshop_participant_season_idx" ON "workshop_completion" USING btree ("workshop_id","participant_id","season_id");