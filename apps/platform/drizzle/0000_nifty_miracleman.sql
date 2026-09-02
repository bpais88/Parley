CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'expired', 'released', 'converted');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('open', 'needs_owner', 'accepted', 'expired', 'declined');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"property_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"offer" jsonb NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"demo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"rooms" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holds_rooms_check" CHECK ("holds"."rooms" between 1 and 12),
	CONSTRAINT "holds_dates_check" CHECK ("holds"."check_out" > "holds"."check_in")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"property_id" uuid NOT NULL,
	"stay_date" date NOT NULL,
	"rooms_sold" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_rooms_sold_check" CHECK ("inventory"."rooms_sold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"booking_id" uuid PRIMARY KEY NOT NULL,
	"property_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_round_check" CHECK ("offers"."round" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"public_key" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"policy" jsonb NOT NULL,
	"total_rooms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_total_rooms_check" CHECK ("properties"."total_rooms" between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"hold_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"request" jsonb NOT NULL,
	"occupancy_pct" integer NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"status" "session_status" DEFAULT 'open' NOT NULL,
	"current_offer" jsonb,
	"checkout_opened" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_occupancy_check" CHECK ("sessions"."occupancy_pct" between 0 and 100),
	CONSTRAINT "sessions_round_check" CHECK ("sessions"."round" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tool_calls_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"property_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"session_id" uuid,
	"tool" text NOT NULL,
	"args" jsonb NOT NULL,
	"result_summary" text NOT NULL,
	"ok" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_calls_latency_check" CHECK ("tool_calls"."latency_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_tokens" ADD CONSTRAINT "checkout_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_hold_id_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."holds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_uidx" ON "bookings" USING btree ("ref");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_session_uidx" ON "bookings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "bookings_property_created_idx" ON "bookings" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_visitor_created_idx" ON "bookings" USING btree ("visitor_id","created_at");--> statement-breakpoint
CREATE INDEX "checkout_tokens_session_expiry_idx" ON "checkout_tokens" USING btree ("session_id","expires_at");--> statement-breakpoint
CREATE INDEX "holds_property_status_expiry_idx" ON "holds" USING btree ("property_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "holds_visitor_created_idx" ON "holds" USING btree ("visitor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_property_date_uidx" ON "inventory" USING btree ("property_id","stay_date");--> statement-breakpoint
CREATE INDEX "ledger_property_created_idx" ON "ledger" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE INDEX "offers_session_round_idx" ON "offers" USING btree ("session_id","round");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_uidx" ON "properties" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_public_key_uidx" ON "properties" USING btree ("public_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_hold_uidx" ON "sessions" USING btree ("hold_id");--> statement-breakpoint
CREATE INDEX "sessions_property_status_created_idx" ON "sessions" USING btree ("property_id","status","created_at");--> statement-breakpoint
CREATE INDEX "sessions_visitor_status_idx" ON "sessions" USING btree ("visitor_id","status");--> statement-breakpoint
CREATE INDEX "tool_calls_property_created_idx" ON "tool_calls" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_calls_session_created_idx" ON "tool_calls" USING btree ("session_id","created_at");