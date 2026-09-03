import type {
  Counter,
  Ledger,
  NeedsOwner,
  NotEligible,
  OccupancyBand,
  Offer,
  OfferReason,
  PaymentPreference,
  Perk,
  PerkCode,
  Policy,
  Request,
} from "@parley/shared";

const DAY_MS = 24 * 60 * 60 * 1_000;

export type Floors = {
  ota_net_cents: number;
  floor_net_cents: number;
  price_min_cents: number;
  cash_floor_cents: number;
  flexible_floor_cents: number;
  allowed_price_cents: number;
};

export type IncludedPerks = {
  included: PerkCode[];
  dropped: PerkCode[];
  cost_per_room_night_cents: number;
};

export type RoundOneInput = {
  policy: Policy;
  request: Request;
  occupancy_pct: number;
  now: string;
};

export type CounterOfferInput = RoundOneInput & {
  previous_offer: Offer;
  counter: Counter;
};

export function ceilToWholeEuro(cents: number): number {
  return Math.ceil(cents / 100) * 100;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = (end - start) / DAY_MS;

  if (!Number.isInteger(nights) || nights < 1) {
    throw new Error("Stay must contain at least one whole night");
  }

  return nights;
}

export function occupancyBandFor(policy: Policy, occupancyPct: number): OccupancyBand {
  const band = policy.occupancy_bands.find(
    ({ min_pct, max_pct }) =>
      occupancyPct >= min_pct &&
      (occupancyPct < max_pct || (max_pct === 100 && occupancyPct === 100)),
  );

  if (!band) {
    throw new Error(`No occupancy band covers ${occupancyPct}%`);
  }

  return band;
}

function percentageOf(cents: number, percentage: number): number {
  return Math.round((cents * percentage) / 100);
}

export function computeFloors(
  policy: Policy,
  band: OccupancyBand,
  inKindCostPerRoomNightCents: number,
  paymentPreference: PaymentPreference,
): Floors {
  const otaNetCents = percentageOf(policy.bar_flex_cents, 100 - policy.ota_commission_pct);
  const floorNetCents = percentageOf(otaNetCents, 100 + policy.min_uplift_pct);
  const feeMultiplier = 1 - policy.platform_fee_pct / 100;
  const priceMinCents = ceilToWholeEuro(
    (floorNetCents + inKindCostPerRoomNightCents) / feeMultiplier,
  );
  const cashFloorCents = percentageOf(
    policy.bar_flex_cents,
    100 - band.max_cash_discount_pct,
  );
  const flexibleFloorCents = percentageOf(policy.bar_flex_cents, 95);
  const paymentFloorCents = paymentPreference === "flexible" ? flexibleFloorCents : 0;
  const allowedPriceCents = ceilToWholeEuro(
    Math.max(priceMinCents, cashFloorCents, paymentFloorCents),
  );

  return {
    ota_net_cents: otaNetCents,
    floor_net_cents: floorNetCents,
    price_min_cents: priceMinCents,
    cash_floor_cents: cashFloorCents,
    flexible_floor_cents: flexibleFloorCents,
    allowed_price_cents: allowedPriceCents,
  };
}

function quantityFor(perk: Perk, request: Request, nights: number): number {
  switch (perk.unit) {
    case "guest_night":
      return request.rooms * request.guests_per_room * nights;
    case "room_night":
      return request.rooms * nights;
    case "room_stay":
      return request.rooms;
  }
}

function totalPerkAmount(
  policy: Policy,
  inclusions: readonly PerkCode[],
  request: Request,
  amount: "cost_cents" | "value_cents",
): number {
  const nights = nightsBetween(request.check_in, request.check_out);
  const included = new Set(inclusions);

  return policy.perks
    .filter((perk) => included.has(perk.code))
    .reduce((total, perk) => total + perk[amount] * quantityFor(perk, request, nights), 0);
}

function costPerRoomNight(policy: Policy, code: PerkCode, request: Request): number {
  const nights = nightsBetween(request.check_in, request.check_out);
  const roomNights = request.rooms * nights;
  const perk = policy.perks.find((candidate) => candidate.code === code);

  if (!perk) {
    return 0;
  }

  return Math.ceil((perk.cost_cents * quantityFor(perk, request, nights)) / roomNights);
}

export function includePerks(
  policy: Policy,
  requested: readonly PerkCode[],
  pricePerNightCents: number,
  occupancyPct: number,
  request: Request,
): IncludedPerks {
  const band = occupancyBandFor(policy, occupancyPct);
  const baseFloors = computeFloors(policy, band, 0, request.payment_preference);
  const availableBudget = Math.max(
    0,
    (pricePerNightCents * (1 - policy.platform_fee_pct / 100) -
      baseFloors.floor_net_cents) *
      band.spend_fraction,
  );
  const requestedCodes = new Set(requested);
  const ranked = policy.perks
    .filter((perk) => requestedCodes.has(perk.code))
    .sort((left, right) => left.rank - right.rank);
  const included: PerkCode[] = [];
  const dropped: PerkCode[] = [];
  let runningCost = 0;

  for (const perk of ranked) {
    const conditionHolds =
      perk.enabled &&
      (perk.max_occupancy_pct === undefined || occupancyPct < perk.max_occupancy_pct);
    const perkCost = costPerRoomNight(policy, perk.code, request);

    if (conditionHolds && (perkCost === 0 || runningCost + perkCost <= availableBudget)) {
      included.push(perk.code);
      runningCost += perkCost;
    } else {
      dropped.push(perk.code);
    }
  }

  for (const code of requestedCodes) {
    if (!policy.perks.some((perk) => perk.code === code)) {
      dropped.push(code);
    }
  }

  return {
    included,
    dropped,
    cost_per_room_night_cents: runningCost,
  };
}

function overlapsBlackout(policy: Policy, request: Request): boolean {
  return policy.blackouts.some(
    (blackout) => request.check_in < blackout.date_to && request.check_out > blackout.date_from,
  );
}

export function escalationCheck(policy: Policy, request: Request): NeedsOwner | null {
  if (request.rooms > policy.escalate_above_rooms) {
    return {
      kind: "needs_owner",
      reason: "room_threshold",
      explanation: "That group is above the automatic limit, so the owner needs to review it.",
    };
  }

  if (request.asks.includes("other")) {
    return {
      kind: "needs_owner",
      reason: "other_ask",
      explanation: "That request is outside the configured perk catalogue, so the owner needs to review it.",
    };
  }

  if (overlapsBlackout(policy, request)) {
    return {
      kind: "needs_owner",
      reason: "blackout",
      explanation: "Those dates overlap a blackout, so the owner needs to review the request.",
    };
  }

  if (
    request.rooms > policy.group_threshold_rooms &&
    request.payment_preference === "flexible"
  ) {
    return {
      kind: "needs_owner",
      reason: "group_requires_prepay",
      explanation: "That group size requires prepayment or an owner review.",
    };
  }

  return null;
}

export function rebookEligibility(request: Request, now: string): NotEligible | null {
  const booking = request.existing_booking;

  if (!booking) {
    return null;
  }

  if (!booking.refundable) {
    return {
      kind: "not_eligible",
      reason: "ota_nonrefundable",
      explanation: "The existing booking is non-refundable, so replacing it would risk a double charge.",
    };
  }

  if (Date.parse(booking.cancellation_deadline) < Date.parse(now) + DAY_MS) {
    return {
      kind: "not_eligible",
      reason: "cancellation_too_close",
      explanation: "The cancellation deadline is under 24 hours away, so this booking is not eligible.",
    };
  }

  return null;
}

function expiryFrom(now: string, ttlMinutes: number): string {
  return new Date(Date.parse(now) + ttlMinutes * 60_000).toISOString();
}

function cityTax(request: Request, policy: Policy): number {
  return (
    policy.city_tax_cents_per_guest_night *
    request.rooms *
    request.guests_per_room *
    nightsBetween(request.check_in, request.check_out)
  );
}

function guestValueScore(
  policy: Policy,
  request: Request,
  pricePerNightCents: number,
  inclusions: readonly PerkCode[],
): number {
  const roomNights = request.rooms * nightsBetween(request.check_in, request.check_out);
  const cashSaving = (policy.bar_flex_cents - pricePerNightCents) * roomNights;
  return cashSaving + totalPerkAmount(policy, inclusions, request, "value_cents");
}

function explanationFor(
  reasons: readonly OfferReason[],
  inclusions: readonly PerkCode[],
  policy: Policy,
  request: Request,
  beatPct?: number,
): string {
  if (reasons.includes("final_offer")) {
    return `Final offer, valid for ${policy.offer_ttl_min} minutes.`;
  }
  if (reasons.includes("standing_offer")) {
    return "The standing offer still gives you the strongest total value available.";
  }
  if (reasons.includes("beat_ota") && request.existing_booking) {
    return `We would rather share the commission: ${beatPct ?? 0}% under your ${request.existing_booking.channel} rate; book here first, then cancel there.`;
  }
  if (reasons.includes("prepay_required")) {
    return "That is below our flexible floor, so it needs prepayment and is non-refundable.";
  }
  if (reasons.includes("perk_dropped")) {
    return "At that price we cannot keep every requested perk.";
  }
  if (reasons.includes("floor_reached")) {
    return "That is the best we can do while still beating what an OTA pays us.";
  }
  if (reasons.includes("low_occupancy_perks")) {
    return `It is a quieter stay for us, so ${inclusions.map((item) => item.replaceAll("_", " ")).join(" and ")} are on the house.`;
  }
  if (reasons.includes("high_occupancy_no_discount")) {
    return "Demand is high for those dates, so the flexible direct rate is our best automatic offer.";
  }
  return "One or more requested perks are not available for those dates.";
}

function makeOffer(input: {
  policy: Policy;
  request: Request;
  pricePerNightCents: number;
  inclusions: PerkCode[];
  round: number;
  ratePlan: "flex" | "nrf";
  reasons: OfferReason[];
  now: string;
  final: boolean;
  beatPct?: number;
}): Offer {
  const {
    policy,
    request,
    pricePerNightCents,
    inclusions,
    round,
    ratePlan,
    reasons,
    now,
    final,
    beatPct,
  } = input;
  const roomNights = request.rooms * nightsBetween(request.check_in, request.check_out);
  const totalCents = pricePerNightCents * roomNights;
  const taxCents = cityTax(request, policy);

  return {
    kind: "offer",
    round,
    price_per_night_cents: pricePerNightCents,
    total_cents: totalCents,
    tax_cents: taxCents,
    all_in_total_cents: totalCents + taxCents,
    rate_plan: ratePlan,
    inclusions,
    payment_terms: ratePlan === "nrf" ? "Prepay now" : "Pay at the hotel",
    cancellation_terms: ratePlan === "nrf" ? "Non-refundable" : "Flexible cancellation",
    expires_at: expiryFrom(now, policy.offer_ttl_min),
    final,
    reasons,
    explanation: explanationFor(reasons, inclusions, policy, request, beatPct),
    guest_value_score_cents: guestValueScore(
      policy,
      request,
      pricePerNightCents,
      inclusions,
    ),
    by: "hotel_policy",
  };
}

function requestedPerks(request: Request): PerkCode[] {
  return request.asks.filter((ask): ask is PerkCode => ask !== "other");
}

function beatPercentage(policy: Policy, band: OccupancyBand): number {
  const raw = policy.ota_commission_pct - policy.min_uplift_pct - policy.platform_fee_pct;
  return Math.max(5, Math.min(raw, band.max_cash_discount_pct));
}

export function roundOneOffer(input: RoundOneInput): Offer | NeedsOwner | NotEligible {
  const { policy, request, occupancy_pct: occupancyPct, now } = input;
  const escalation = escalationCheck(policy, request);
  if (escalation) {
    return escalation;
  }

  const notEligible = rebookEligibility(request, now);
  if (notEligible) {
    return notEligible;
  }

  const band = occupancyBandFor(policy, occupancyPct);
  const asks = requestedPerks(request);
  let pricePerNightCents = policy.bar_flex_cents;
  let beatPct: number | undefined;

  if (request.existing_booking) {
    beatPct = beatPercentage(policy, band);
    const otaTarget =
      request.existing_booking.rate_per_night_cents * (1 - beatPct / 100);
    const provisionalPrice = ceilToWholeEuro(otaTarget);
    const provisionalPerks = includePerks(
      policy,
      asks,
      provisionalPrice,
      occupancyPct,
      request,
    );
    const floors = computeFloors(
      policy,
      band,
      provisionalPerks.cost_per_room_night_cents,
      request.payment_preference,
    );
    pricePerNightCents = ceilToWholeEuro(Math.max(otaTarget, floors.allowed_price_cents));
  }

  const perkResult = includePerks(policy, asks, pricePerNightCents, occupancyPct, request);
  const flexibleFloor = percentageOf(policy.bar_flex_cents, 95);
  const ratePlan =
    request.payment_preference === "prepaid_ok" && pricePerNightCents < flexibleFloor
      ? "nrf"
      : "flex";
  let reasons: OfferReason[];

  if (request.existing_booking) {
    reasons = ["beat_ota"];
  } else if (perkResult.included.length > 0 && band.spend_fraction > 0) {
    reasons = ["low_occupancy_perks"];
  } else if (band.max_cash_discount_pct === 0) {
    reasons = ["high_occupancy_no_discount"];
  } else {
    reasons = ["perk_not_available"];
  }

  return makeOffer({
    policy,
    request,
    pricePerNightCents,
    inclusions: perkResult.included,
    round: 1,
    ratePlan,
    reasons,
    now,
    final: policy.max_rounds === 1,
    beatPct,
  });
}

function standingOffer(
  previous: Offer,
  round: number,
  final: boolean,
  now: string,
  policy: Policy,
  request: Request,
): Offer {
  const reasons: OfferReason[] = final ? ["final_offer"] : ["standing_offer"];
  return {
    ...previous,
    round,
    final,
    reasons,
    expires_at: expiryFrom(now, policy.offer_ttl_min),
    explanation: explanationFor(reasons, previous.inclusions, policy, request),
  };
}

export function counterOffer(input: CounterOfferInput): Offer {
  const {
    policy,
    request,
    occupancy_pct: occupancyPct,
    now,
    previous_offer: previous,
    counter,
  } = input;

  if (previous.final || previous.round >= policy.max_rounds) {
    return standingOffer(previous, previous.round, true, now, policy, request);
  }

  const nextRound = previous.round + 1;
  const final = nextRound >= policy.max_rounds;
  const roomNights = request.rooms * nightsBetween(request.check_in, request.check_out);
  const targetPerNight =
    counter.target_per_night_cents ?? (counter.target_total_cents as number) / roomNights;
  const candidates = counter.keep_inclusions ? previous.inclusions : [];
  const provisionalPerks = includePerks(
    policy,
    candidates,
    previous.price_per_night_cents,
    occupancyPct,
    { ...request, payment_preference: counter.payment_preference },
  );
  const band = occupancyBandFor(policy, occupancyPct);
  const floors = computeFloors(
    policy,
    band,
    provisionalPerks.cost_per_room_night_cents,
    counter.payment_preference,
  );
  const pricePerNightCents = ceilToWholeEuro(
    Math.max(targetPerNight, floors.allowed_price_cents),
  );
  const counterRequest = { ...request, payment_preference: counter.payment_preference };
  const perkResult = includePerks(
    policy,
    candidates,
    pricePerNightCents,
    occupancyPct,
    counterRequest,
  );
  const flexibleFloor = percentageOf(policy.bar_flex_cents, 95);
  const ratePlan =
    counter.payment_preference === "prepaid_ok" && pricePerNightCents < flexibleFloor
      ? "nrf"
      : "flex";
  const reasons: OfferReason[] = [];

  if (ratePlan === "nrf") {
    reasons.push("prepay_required");
  }
  if (pricePerNightCents === floors.allowed_price_cents) {
    reasons.push("floor_reached");
  }
  if (perkResult.dropped.length > 0) {
    reasons.push("perk_dropped");
  }
  if (reasons.length === 0) {
    reasons.push("low_occupancy_perks");
  }

  const candidate = makeOffer({
    policy,
    request: counterRequest,
    pricePerNightCents,
    inclusions: perkResult.included,
    round: nextRound,
    ratePlan,
    reasons,
    now,
    final,
  });

  if (candidate.guest_value_score_cents <= previous.guest_value_score_cents) {
    return standingOffer(previous, nextRound, final, now, policy, request);
  }

  return candidate;
}

export function ledgerFor(policy: Policy, request: Request, offer: Offer): Ledger {
  const roomNights = request.rooms * nightsBetween(request.check_in, request.check_out);
  const grossCents = offer.total_cents;
  const inKindCostCents = totalPerkAmount(
    policy,
    offer.inclusions,
    request,
    "cost_cents",
  );
  const platformFeeCents = percentageOf(grossCents, policy.platform_fee_pct);
  const netCents = grossCents - inKindCostCents - platformFeeCents;
  const otaNetAtRackCents = percentageOf(
    policy.bar_flex_cents * roomNights,
    100 - policy.ota_commission_pct,
  );

  return {
    gross_cents: grossCents,
    inkind_cost_cents: inKindCostCents,
    platform_fee_cents: platformFeeCents,
    net_cents: netCents,
    ota_net_at_rack_cents: otaNetAtRackCents,
    uplift_vs_ota_cents: netCents - otaNetAtRackCents,
    guest_saving_vs_rack_cents: policy.bar_flex_cents * roomNights - grossCents,
    guest_perk_value_cents: totalPerkAmount(
      policy,
      offer.inclusions,
      request,
      "value_cents",
    ),
  };
}
