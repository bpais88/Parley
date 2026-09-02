import { describe, expect, it } from "vitest";
import {
  CounterSchema,
  LedgerSchema,
  OfferSchema,
  PolicySchema,
  RequestSchema,
  type Policy,
  type Request,
} from "@parley/shared";
import {
  computeFloors,
  counterOffer,
  escalationCheck,
  includePerks,
  ledgerFor,
  occupancyBandFor,
  rebookEligibility,
  roundOneOffer,
} from "./index";

const NOW = "2026-09-02T21:00:00.000Z";

const policy: Policy = PolicySchema.parse({
  property_name: "Casa do Zêzere",
  currency: "EUR",
  timezone: "Europe/Lisbon",
  bar_flex_cents: 11_000,
  city_tax_cents_per_guest_night: 200,
  nrf_discount_pct: 10,
  ota_commission_pct: 20,
  min_uplift_pct: 5,
  platform_fee_pct: 3,
  group_threshold_rooms: 8,
  escalate_above_rooms: 8,
  max_rounds: 3,
  offer_ttl_min: 10,
  hold_ttl_min: 15,
  voice: "warm, short, Portuguese family hotel",
  perks: [
    {
      code: "breakfast",
      label: "Breakfast",
      cost_cents: 600,
      value_cents: 1_200,
      unit: "guest_night",
      rank: 1,
      enabled: true,
    },
    {
      code: "late_checkout",
      label: "Late checkout",
      cost_cents: 0,
      value_cents: 1_500,
      unit: "room_stay",
      rank: 2,
      enabled: true,
    },
    {
      code: "early_checkin",
      label: "Early check-in",
      cost_cents: 0,
      value_cents: 1_000,
      unit: "room_stay",
      rank: 3,
      enabled: true,
    },
    {
      code: "upgrade",
      label: "Upgrade",
      cost_cents: 0,
      value_cents: 3_000,
      unit: "room_stay",
      rank: 4,
      enabled: true,
      max_occupancy_pct: 60,
    },
    {
      code: "parking",
      label: "Parking",
      cost_cents: 0,
      value_cents: 800,
      unit: "room_stay",
      rank: 5,
      enabled: true,
    },
  ],
  occupancy_bands: [
    { min_pct: 0, max_pct: 50, spend_fraction: 1, max_cash_discount_pct: 12 },
    { min_pct: 50, max_pct: 70, spend_fraction: 0.5, max_cash_discount_pct: 8 },
    { min_pct: 70, max_pct: 85, spend_fraction: 0.25, max_cash_discount_pct: 4 },
    { min_pct: 85, max_pct: 100, spend_fraction: 0, max_cash_discount_pct: 0 },
  ],
  blackouts: [
    {
      date_from: "2026-10-10",
      date_to: "2026-10-12",
      reason: "Festival weekend",
    },
  ],
});

const offsiteRequest: Request = RequestSchema.parse({
  check_in: "2026-09-24",
  check_out: "2026-09-27",
  rooms: 5,
  guests_per_room: 1,
  asks: ["breakfast", "late_checkout"],
  payment_preference: "flexible",
});

function requireOffer(result: ReturnType<typeof roundOneOffer>) {
  expect(result.kind).toBe("offer");
  if (result.kind !== "offer") {
    throw new Error(`Expected offer, received ${result.kind}`);
  }
  return OfferSchema.parse(result);
}

describe("worked example", () => {
  it("reproduces both offers, the corrected all-in amount, and ledger to the cent", () => {
    const first = requireOffer(
      roundOneOffer({
        policy,
        request: offsiteRequest,
        occupancy_pct: 42,
        now: NOW,
      }),
    );

    expect(first).toMatchObject({
      round: 1,
      price_per_night_cents: 11_000,
      total_cents: 165_000,
      tax_cents: 3_000,
      all_in_total_cents: 168_000,
      rate_plan: "flex",
      inclusions: ["breakfast", "late_checkout"],
      final: false,
      reasons: ["low_occupancy_perks"],
    });
    expect(first.expires_at).toBe("2026-09-02T21:10:00.000Z");

    const second = OfferSchema.parse(
      counterOffer({
        policy,
        request: offsiteRequest,
        occupancy_pct: 42,
        now: "2026-09-02T21:01:00.000Z",
        previous_offer: first,
        counter: CounterSchema.parse({
          target_total_cents: 140_000,
          keep_inclusions: true,
          payment_preference: "prepaid_ok",
        }),
      }),
    );

    expect(second).toMatchObject({
      round: 2,
      price_per_night_cents: 10_200,
      total_cents: 153_000,
      tax_cents: 3_000,
      all_in_total_cents: 156_000,
      rate_plan: "nrf",
      inclusions: ["breakfast", "late_checkout"],
      final: false,
      reasons: ["prepay_required", "floor_reached"],
    });

    expect(LedgerSchema.parse(ledgerFor(policy, offsiteRequest, second))).toEqual({
      gross_cents: 153_000,
      inkind_cost_cents: 9_000,
      platform_fee_cents: 4_590,
      net_cents: 139_410,
      ota_net_at_rack_cents: 132_000,
      uplift_vs_ota_cents: 7_410,
      guest_saving_vs_rack_cents: 12_000,
      guest_perk_value_cents: 25_500,
    });

    const finalStanding = counterOffer({
      policy,
      request: offsiteRequest,
      occupancy_pct: 42,
      now: "2026-09-02T21:02:00.000Z",
      previous_offer: second,
      counter: CounterSchema.parse({
        target_total_cents: 145_000,
        keep_inclusions: true,
        payment_preference: "prepaid_ok",
      }),
    });

    expect(finalStanding).toMatchObject({
      round: 3,
      total_cents: 153_000,
      final: true,
      reasons: ["final_offer"],
    });
  });
});

describe("floors and occupancy bands", () => {
  it.each([
    [45, 1, 12],
    [60, 0.5, 8],
    [78, 0.25, 4],
    [90, 0, 0],
  ])(
    "maps %s%% occupancy to spend fraction %s and cash discount %s%%",
    (occupancy, spendFraction, discount) => {
      const band = occupancyBandFor(policy, occupancy);
      expect(band.spend_fraction).toBe(spendFraction);
      expect(band.max_cash_discount_pct).toBe(discount);
    },
  );

  it("lets the perk-supported economic floor bind", () => {
    const floors = computeFloors(policy, occupancyBandFor(policy, 42), 600, "prepaid_ok");
    expect(floors).toMatchObject({
      ota_net_cents: 8_800,
      floor_net_cents: 9_240,
      price_min_cents: 10_200,
      cash_floor_cents: 9_680,
      allowed_price_cents: 10_200,
    });
  });

  it("lets the occupancy cash floor bind", () => {
    const floors = computeFloors(policy, occupancyBandFor(policy, 78), 0, "prepaid_ok");
    expect(floors.cash_floor_cents).toBe(10_560);
    expect(floors.allowed_price_cents).toBe(10_600);
  });

  it("enforces the flexible floor and rounds it up to a whole euro", () => {
    const floors = computeFloors(policy, occupancyBandFor(policy, 42), 0, "flexible");
    expect(floors.flexible_floor_cents).toBe(10_450);
    expect(floors.allowed_price_cents).toBe(10_500);
  });
});

describe("perks and monotonicity", () => {
  it("keeps breakfast when the envelope fits and keeps zero-cost late checkout", () => {
    expect(includePerks(policy, ["breakfast", "late_checkout"], 10_200, 42, offsiteRequest)).toEqual({
      included: ["breakfast", "late_checkout"],
      dropped: [],
      cost_per_room_night_cents: 600,
    });
  });

  it("drops breakfast when the reduced spend fraction cannot fund it", () => {
    expect(includePerks(policy, ["breakfast", "late_checkout"], 10_200, 60, offsiteRequest)).toEqual({
      included: ["late_checkout"],
      dropped: ["breakfast"],
      cost_per_room_night_cents: 0,
    });
  });

  it("offers only zero-cost perks above 85% occupancy", () => {
    expect(includePerks(policy, ["breakfast", "late_checkout"], 11_000, 90, offsiteRequest)).toEqual({
      included: ["late_checkout"],
      dropped: ["breakfast"],
      cost_per_room_night_cents: 0,
    });
  });

  it("returns the standing offer rather than reducing guest value", () => {
    const first = requireOffer(
      roundOneOffer({ policy, request: offsiteRequest, occupancy_pct: 42, now: NOW }),
    );
    const standing = counterOffer({
      policy,
      request: offsiteRequest,
      occupancy_pct: 42,
      now: "2026-09-02T21:01:00.000Z",
      previous_offer: first,
      counter: CounterSchema.parse({
        target_total_cents: 200_000,
        keep_inclusions: true,
        payment_preference: "flexible",
      }),
    });

    expect(standing.total_cents).toBe(first.total_cents);
    expect(standing.guest_value_score_cents).toBe(first.guest_value_score_cents);
    expect(standing.reasons).toEqual(["standing_offer"]);
  });
});

describe("escalation", () => {
  it.each([
    ["room threshold", { rooms: 9 }, "room_threshold"],
    ["uncatalogued ask", { asks: ["other"] }, "other_ask"],
    [
      "blackout",
      { check_in: "2026-10-10", check_out: "2026-10-12" },
      "blackout",
    ],
  ] as const)("detects %s", (_label, changes, reason) => {
    const request = RequestSchema.parse({ ...offsiteRequest, ...changes });
    expect(escalationCheck(policy, request)?.reason).toBe(reason);
  });

  it("requires prepayment above a separately configured group threshold", () => {
    const request = RequestSchema.parse({ ...offsiteRequest, rooms: 5 });
    expect(
      escalationCheck(
        { ...policy, group_threshold_rooms: 4, escalate_above_rooms: 8 },
        request,
      )?.reason,
    ).toBe("group_requires_prepay");
  });
});

describe("rebook direct", () => {
  const existingBooking = {
    channel: "Booking.com",
    rate_per_night_cents: 12_000,
    total_cents: 24_000,
    check_in: "2026-09-17",
    check_out: "2026-09-19",
    refundable: true,
    cancellation_deadline: "2026-09-08T12:00:00.000Z",
  } as const;

  function rebookRequest(changes: Record<string, unknown> = {}): Request {
    return RequestSchema.parse({
      check_in: "2026-09-17",
      check_out: "2026-09-19",
      rooms: 1,
      guests_per_room: 1,
      asks: ["breakfast"],
      payment_preference: "prepaid_ok",
      existing_booking: { ...existingBooking, ...changes },
    });
  }

  it("offers the rounded €106 beat-OTA rate on flexible terms", () => {
    const offer = requireOffer(
      roundOneOffer({
        policy,
        request: rebookRequest(),
        occupancy_pct: 42,
        now: NOW,
      }),
    );

    expect(offer).toMatchObject({
      price_per_night_cents: 10_600,
      total_cents: 21_200,
      rate_plan: "flex",
      inclusions: ["breakfast"],
      reasons: ["beat_ota"],
    });
    expect(offer.explanation).toContain("book here first, then cancel there");
  });

  it("rejects a non-refundable OTA booking", () => {
    expect(rebookEligibility(rebookRequest({ refundable: false }), NOW)?.reason).toBe(
      "ota_nonrefundable",
    );
  });

  it("rejects a cancellation deadline under 24 hours away", () => {
    expect(
      rebookEligibility(
        rebookRequest({ cancellation_deadline: "2026-09-03T20:00:00.000Z" }),
        NOW,
      )?.reason,
    ).toBe("cancellation_too_close");
  });
});

describe("shared contract", () => {
  it("rejects unknown request properties", () => {
    expect(() => RequestSchema.parse({ ...offsiteRequest, surprise: true })).toThrow();
  });

  it("requires exactly one counter target", () => {
    expect(() =>
      CounterSchema.parse({
        target_total_cents: 140_000,
        target_per_night_cents: 9_333,
        keep_inclusions: true,
        payment_preference: "prepaid_ok",
      }),
    ).toThrow();
  });
});
