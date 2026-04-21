CREATE TABLE "submission_closure_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"season_id" text NOT NULL,
	"pathway" "pathway" NOT NULL,
	"week_number" integer NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_season_id_program_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."program_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_closure_exception" ADD CONSTRAINT "submission_closure_exception_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "submission_exception_unique_idx" ON "submission_closure_exception" USING btree ("user_id","season_id","pathway","week_number");--> statement-breakpoint
CREATE INDEX "submission_exception_lookup_idx" ON "submission_closure_exception" USING btree ("season_id","pathway","week_number");--> statement-breakpoint
CREATE INDEX "submission_exception_user_idx" ON "submission_closure_exception" USING btree ("user_id","season_id");