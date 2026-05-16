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
ALTER TABLE "referral_link" ADD CONSTRAINT "referral_link_ambassador_id_user_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signup" ADD CONSTRAINT "referral_signup_referral_link_id_referral_link_id_fk" FOREIGN KEY ("referral_link_id") REFERENCES "public"."referral_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signup" ADD CONSTRAINT "referral_signup_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_signup_unique_idx" ON "referral_signup" USING btree ("referral_link_id","user_id");