ALTER TABLE "pilot_signups" ADD COLUMN "negotiation_rules" jsonb;--> statement-breakpoint
ALTER TABLE "pilot_signups" ADD COLUMN "contact_settings" jsonb;--> statement-breakpoint
UPDATE "pilot_signups"
SET
  "negotiation_rules" = '{"min_hotel_uplift_pct":5,"quiet_dates_max_discount_pct":12,"preferred_perks":["breakfast","late_checkout"],"owner_review_above_rooms":8,"prepay_required_over_discount_pct":5,"voice":"Warm, brief and welcoming"}'::jsonb,
  "contact_settings" = '{"guest_contact_policy":"do_not_collect"}'::jsonb
WHERE "negotiation_rules" IS NULL OR "contact_settings" IS NULL;--> statement-breakpoint
ALTER TABLE "pilot_signups" ALTER COLUMN "negotiation_rules" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pilot_signups" ALTER COLUMN "contact_settings" SET NOT NULL;
