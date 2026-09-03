ALTER TABLE "pilot_signups" ADD COLUMN "city" text;--> statement-breakpoint
UPDATE "pilot_signups" SET "city" = 'Not provided' WHERE "city" IS NULL;--> statement-breakpoint
ALTER TABLE "pilot_signups" ALTER COLUMN "city" SET NOT NULL;
