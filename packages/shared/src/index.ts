import { z } from "zod";

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const UtcInstantSchema = z.iso.datetime({ offset: true });
export const CentsSchema = z.number().int().nonnegative();
export const PercentageSchema = z.number().min(0).max(100);
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/);

export const PerkCodeSchema = z.enum([
  "breakfast",
  "late_checkout",
  "early_checkin",
  "upgrade",
  "parking",
]);

export const AskSchema = z.union([PerkCodeSchema, z.literal("other")]);
export const PaymentPreferenceSchema = z.enum(["flexible", "prepaid_ok"]);
export const RatePlanSchema = z.enum(["flex", "nrf"]);
export const PerkUnitSchema = z.enum(["guest_night", "room_night", "room_stay"]);

export const PerkSchema = z
  .object({
    code: PerkCodeSchema,
    label: z.string().min(1).max(80),
    cost_cents: CentsSchema,
    value_cents: CentsSchema,
    unit: PerkUnitSchema,
    rank: z.number().int().positive(),
    enabled: z.boolean(),
    max_occupancy_pct: PercentageSchema.optional(),
  })
  .strict();

export const OccupancyBandSchema = z
  .object({
    min_pct: PercentageSchema,
    max_pct: PercentageSchema,
    spend_fraction: z.number().min(0).max(1),
    max_cash_discount_pct: PercentageSchema,
  })
  .strict()
  .refine((band) => band.max_pct > band.min_pct, {
    message: "max_pct must be greater than min_pct",
  });

export const BlackoutSchema = z
  .object({
    date_from: DateStringSchema,
    date_to: DateStringSchema,
    reason: z.string().min(1).max(160),
  })
  .strict()
  .refine((blackout) => blackout.date_to > blackout.date_from, {
    message: "date_to must be after date_from",
  });

export const PolicySchema = z
  .object({
    property_name: z.string().min(1).max(120),
    currency: CurrencySchema,
    timezone: z.string().min(1).max(80),
    bar_flex_cents: CentsSchema.positive(),
    city_tax_cents_per_guest_night: CentsSchema,
    nrf_discount_pct: PercentageSchema,
    ota_commission_pct: PercentageSchema,
    min_uplift_pct: PercentageSchema,
    platform_fee_pct: PercentageSchema,
    group_threshold_rooms: z.number().int().positive(),
    escalate_above_rooms: z.number().int().positive(),
    max_rounds: z.number().int().min(1).max(10),
    offer_ttl_min: z.number().int().positive(),
    hold_ttl_min: z.number().int().positive(),
    voice: z.string().min(1).max(160),
    perks: z.array(PerkSchema),
    occupancy_bands: z.array(OccupancyBandSchema).min(1),
    blackouts: z.array(BlackoutSchema),
  })
  .strict();

export const ExistingBookingSchema = z
  .object({
    channel: z.string().min(1).max(80),
    rate_per_night_cents: CentsSchema.positive(),
    total_cents: CentsSchema.positive(),
    check_in: DateStringSchema,
    check_out: DateStringSchema,
    refundable: z.boolean(),
    cancellation_deadline: UtcInstantSchema,
  })
  .strict();

export const RequestSchema = z
  .object({
    check_in: DateStringSchema,
    check_out: DateStringSchema,
    rooms: z.number().int().min(1).max(12),
    guests_per_room: z.number().int().min(1).max(4),
    asks: z.array(AskSchema).max(6),
    payment_preference: PaymentPreferenceSchema,
    notes: z.string().max(200).optional(),
    existing_booking: ExistingBookingSchema.optional(),
  })
  .strict()
  .refine((request) => request.check_out > request.check_in, {
    message: "check_out must be after check_in",
  });

export const CounterSchema = z
  .object({
    target_total_cents: CentsSchema.positive().optional(),
    target_per_night_cents: CentsSchema.positive().optional(),
    keep_inclusions: z.boolean(),
    payment_preference: PaymentPreferenceSchema,
    message: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (counter) =>
      Number(counter.target_total_cents !== undefined) +
        Number(counter.target_per_night_cents !== undefined) ===
      1,
    { message: "Provide exactly one target" },
  );

export const OfferReasonSchema = z.enum([
  "low_occupancy_perks",
  "high_occupancy_no_discount",
  "perk_not_available",
  "prepay_required",
  "floor_reached",
  "beat_ota",
  "final_offer",
  "perk_dropped",
  "standing_offer",
]);

export const OfferSchema = z
  .object({
    kind: z.literal("offer"),
    round: z.number().int().positive(),
    price_per_night_cents: CentsSchema.positive(),
    total_cents: CentsSchema.positive(),
    tax_cents: CentsSchema,
    all_in_total_cents: CentsSchema.positive(),
    rate_plan: RatePlanSchema,
    inclusions: z.array(PerkCodeSchema),
    payment_terms: z.string().min(1).max(120),
    cancellation_terms: z.string().min(1).max(160),
    expires_at: UtcInstantSchema,
    final: z.boolean(),
    reasons: z.array(OfferReasonSchema).min(1),
    explanation: z.string().min(1).max(400),
    guest_value_score_cents: z.number().int(),
    by: z.enum(["hotel_policy", "owner"]),
  })
  .strict();

export const NeedsOwnerSchema = z
  .object({
    kind: z.literal("needs_owner"),
    reason: z.enum(["room_threshold", "other_ask", "blackout", "group_requires_prepay"]),
    explanation: z.string().min(1).max(400),
  })
  .strict();

export const NotEligibleSchema = z
  .object({
    kind: z.literal("not_eligible"),
    reason: z.enum(["ota_nonrefundable", "cancellation_too_close"]),
    explanation: z.string().min(1).max(400),
  })
  .strict();

export const NegotiationResultSchema = z.discriminatedUnion("kind", [
  OfferSchema,
  NeedsOwnerSchema,
  NotEligibleSchema,
]);

export const LedgerSchema = z
  .object({
    gross_cents: CentsSchema,
    inkind_cost_cents: CentsSchema,
    platform_fee_cents: CentsSchema,
    net_cents: z.number().int(),
    ota_net_at_rack_cents: CentsSchema,
    uplift_vs_ota_cents: z.number().int(),
    guest_saving_vs_rack_cents: z.number().int(),
    guest_perk_value_cents: CentsSchema,
  })
  .strict();

export const ToolSuccessEnvelopeSchema = z
  .object({
    ok: z.literal(true),
    human_summary: z.string().min(1).max(400),
    next_actions: z.array(z.string().min(1).max(80)),
  })
  .loose();

export const ToolErrorEnvelopeSchema = z
  .object({
    ok: z.literal(false),
    error_code: z.string().min(1).max(80),
    human_summary: z.string().min(1).max(400),
  })
  .strict();

export const ToolResultEnvelopeSchema = z.union([
  ToolSuccessEnvelopeSchema,
  ToolErrorEnvelopeSchema,
]);

export type Policy = z.infer<typeof PolicySchema>;
export type Perk = z.infer<typeof PerkSchema>;
export type PerkCode = z.infer<typeof PerkCodeSchema>;
export type OccupancyBand = z.infer<typeof OccupancyBandSchema>;
export type Request = z.infer<typeof RequestSchema>;
export type ExistingBooking = z.infer<typeof ExistingBookingSchema>;
export type Counter = z.infer<typeof CounterSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type NeedsOwner = z.infer<typeof NeedsOwnerSchema>;
export type NotEligible = z.infer<typeof NotEligibleSchema>;
export type NegotiationResult = z.infer<typeof NegotiationResultSchema>;
export type Ledger = z.infer<typeof LedgerSchema>;
export type PaymentPreference = z.infer<typeof PaymentPreferenceSchema>;
export type OfferReason = z.infer<typeof OfferReasonSchema>;
