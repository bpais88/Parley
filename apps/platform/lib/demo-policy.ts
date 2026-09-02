import { PolicySchema, type Policy } from "@parley/shared";

export const DEMO_PROPERTY_SLUG = "casa-do-zezere";
export const DEMO_PUBLIC_KEY = "parley_casa_demo_v1";
export const DEMO_TOTAL_ROOMS = 12;

export const DEMO_POLICY: Policy = PolicySchema.parse({
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
      label: "Upgrade when available",
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
