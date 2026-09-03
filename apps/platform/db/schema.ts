import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  HotelContactSettings,
  HotelNegotiationRules,
  Ledger,
  Offer,
  Policy,
  Request,
} from "@parley/shared";

export const holdStatus = pgEnum("hold_status", [
  "active",
  "expired",
  "released",
  "converted",
]);
export const sessionStatus = pgEnum("session_status", [
  "open",
  "needs_owner",
  "accepted",
  "expired",
  "declined",
]);
export const bookingStatus = pgEnum("booking_status", ["confirmed", "cancelled"]);

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    publicKey: text("public_key").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    policy: jsonb("policy").$type<Policy>().notNull(),
    totalRooms: integer("total_rooms").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("properties_slug_uidx").on(table.slug),
    uniqueIndex("properties_public_key_uidx").on(table.publicKey),
    check("properties_total_rooms_check", sql`${table.totalRooms} between 1 and 1000`),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    stayDate: date("stay_date").notNull(),
    roomsSold: integer("rooms_sold").notNull().default(0),
  },
  (table) => [
    uniqueIndex("inventory_property_date_uidx").on(table.propertyId, table.stayDate),
    check("inventory_rooms_sold_check", sql`${table.roomsSold} >= 0`),
  ],
);

export const holds = pgTable(
  "holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    rooms: integer("rooms").notNull(),
    guestsPerRoom: integer("guests_per_room").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: holdStatus("status").notNull().default("active"),
    createdAt,
  },
  (table) => [
    index("holds_property_status_expiry_idx").on(
      table.propertyId,
      table.status,
      table.expiresAt,
    ),
    index("holds_visitor_created_idx").on(table.visitorId, table.createdAt),
    check("holds_rooms_check", sql`${table.rooms} between 1 and 12`),
    check("holds_guests_check", sql`${table.guestsPerRoom} between 1 and 4`),
    check("holds_dates_check", sql`${table.checkOut} > ${table.checkIn}`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    holdId: uuid("hold_id")
      .notNull()
      .references(() => holds.id, { onDelete: "restrict" }),
    visitorId: text("visitor_id").notNull(),
    request: jsonb("request").$type<Request>().notNull(),
    occupancyPct: integer("occupancy_pct").notNull(),
    round: integer("round").notNull().default(1),
    status: sessionStatus("status").notNull().default("open"),
    currentOffer: jsonb("current_offer").$type<Offer>(),
    checkoutOpened: boolean("checkout_opened").notNull().default(false),
    createdAt,
  },
  (table) => [
    uniqueIndex("sessions_hold_uidx").on(table.holdId),
    index("sessions_property_status_created_idx").on(
      table.propertyId,
      table.status,
      table.createdAt,
    ),
    index("sessions_visitor_status_idx").on(table.visitorId, table.status),
    check("sessions_occupancy_check", sql`${table.occupancyPct} between 0 and 100`),
    check("sessions_round_check", sql`${table.round} between 1 and 10`),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    payload: jsonb("payload").$type<Offer>().notNull(),
    createdAt,
  },
  (table) => [
    index("offers_session_round_idx").on(table.sessionId, table.round),
    check("offers_round_check", sql`${table.round} between 1 and 10`),
  ],
);

export const checkoutTokens = pgTable(
  "checkout_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("checkout_tokens_session_expiry_idx").on(table.sessionId, table.expiresAt),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "restrict" }),
    visitorId: text("visitor_id").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    offer: jsonb("offer").$type<Offer>().notNull(),
    status: bookingStatus("status").notNull().default("confirmed"),
    demo: boolean("demo").notNull().default(true),
    createdAt,
  },
  (table) => [
    uniqueIndex("bookings_ref_uidx").on(table.ref),
    uniqueIndex("bookings_session_uidx").on(table.sessionId),
    index("bookings_property_created_idx").on(table.propertyId, table.createdAt),
    index("bookings_visitor_created_idx").on(table.visitorId, table.createdAt),
  ],
);

export const ledger = pgTable(
  "ledger",
  {
    bookingId: uuid("booking_id")
      .primaryKey()
      .references(() => bookings.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<Ledger>().notNull(),
    createdAt,
  },
  (table) => [index("ledger_property_created_idx").on(table.propertyId, table.createdAt)],
);

export const toolCalls = pgTable(
  "tool_calls",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    tool: text("tool").notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull(),
    resultSummary: text("result_summary").notNull(),
    ok: boolean("ok").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    createdAt,
  },
  (table) => [
    index("tool_calls_property_created_idx").on(table.propertyId, table.createdAt),
    index("tool_calls_session_created_idx").on(table.sessionId, table.createdAt),
    check("tool_calls_latency_check", sql`${table.latencyMs} >= 0`),
  ],
);

export const pilotSignups = pgTable(
  "pilot_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: text("visitor_id").notNull(),
    hotelName: text("hotel_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    website: text("website").notNull(),
    rooms: integer("rooms").notNull(),
    otaCommissionPct: integer("ota_commission_pct").notNull(),
    negotiationRules: jsonb("negotiation_rules")
      .$type<HotelNegotiationRules>()
      .notNull(),
    contactSettings: jsonb("contact_settings")
      .$type<HotelContactSettings>()
      .notNull(),
    status: text("status").notNull().default("new"),
    createdAt,
  },
  (table) => [
    uniqueIndex("pilot_signups_email_website_uidx").on(
      table.contactEmail,
      table.website,
    ),
    index("pilot_signups_created_idx").on(table.createdAt),
    check("pilot_signups_rooms_check", sql`${table.rooms} between 1 and 2000`),
    check(
      "pilot_signups_commission_check",
      sql`${table.otaCommissionPct} between 0 and 40`,
    ),
  ],
);
