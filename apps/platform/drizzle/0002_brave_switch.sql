CREATE TABLE "pilot_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"hotel_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"website" text NOT NULL,
	"rooms" integer NOT NULL,
	"ota_commission_pct" integer NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilot_signups_rooms_check" CHECK ("pilot_signups"."rooms" between 1 and 2000),
	CONSTRAINT "pilot_signups_commission_check" CHECK ("pilot_signups"."ota_commission_pct" between 0 and 40)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_signups_email_website_uidx" ON "pilot_signups" USING btree ("contact_email","website");--> statement-breakpoint
CREATE INDEX "pilot_signups_created_idx" ON "pilot_signups" USING btree ("created_at");