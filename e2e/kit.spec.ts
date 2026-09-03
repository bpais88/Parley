import { expect, test, type Page } from "@playwright/test";

const offerOne = {
  kind: "offer",
  round: 1,
  price_per_night_cents: 11_000,
  total_cents: 165_000,
  tax_cents: 3_000,
  all_in_total_cents: 168_000,
  rate_plan: "flex",
  inclusions: ["breakfast", "late_checkout"],
  payment_terms: "Pay at the hotel",
  cancellation_terms: "Flexible cancellation",
  expires_at: "2099-09-03T12:00:00.000Z",
  final: false,
  reasons: ["low_occupancy_perks"],
  explanation: "Quiet weekend for us, so breakfast and late checkout are on the house.",
  guest_value_score_cents: 25_500,
  by: "hotel_policy",
};

const offerTwo = {
  ...offerOne,
  round: 2,
  price_per_night_cents: 10_200,
  total_cents: 153_000,
  all_in_total_cents: 156_000,
  rate_plan: "nrf",
  payment_terms: "Prepay now",
  cancellation_terms: "Non-refundable",
  reasons: ["prepay_required", "floor_reached"],
  explanation: "That's below our flexible floor, so it needs prepayment and it's non-refundable.",
  guest_value_score_cents: 37_500,
};

const rebookOffer = {
  ...offerOne,
  price_per_night_cents: 11_100,
  total_cents: 22_200,
  tax_cents: 400,
  all_in_total_cents: 22_600,
  inclusions: ["breakfast"],
  reasons: ["beat_ota"],
  explanation:
    "We would rather share the commission: 8% under your Booking.com rate; book here first, then cancel there.",
  guest_value_score_cents: 2_200,
};

async function mockPlatform(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: Record<string, unknown> = {
      ok: true,
      human_summary: "Recorded.",
      next_actions: [],
    };
    if (path.includes("/properties/") && path.endsWith("/bootstrap")) {
      body = {
        ok: true,
        human_summary: "Casa do Zêzere offers negotiable direct rates.",
        next_actions: ["search_availability"],
        property: { slug: "casa-do-zezere", name: "Casa do Zêzere", currency: "EUR" },
        policy: {
          negotiable: true,
          beats_ota_up_to_pct: 12,
          group_threshold_rooms: 8,
          max_rounds: 3,
          offer_ttl_min: 10,
          hold_ttl_min: 15,
          perks: [
            { code: "breakfast", label: "Breakfast", value_cents: 1_200 },
            { code: "late_checkout", label: "Late checkout", value_cents: 1_500 },
          ],
          human_only: ["accept", "payment", "cancellation_elsewhere"],
        },
      };
    } else if (path === "/api/v1/owner/ledger") {
      body = {
        ok: true,
        human_summary: "One direct booking produced €74.10 versus OTA economics.",
        next_actions: [],
        totals: { bookings: 1, gross_cents: 153_000, net_cents: 139_410, uplift_vs_ota_cents: 7_410 },
        bookings: [{
          booking_ref: "CZ-7F3K",
          created_at: "2026-09-02T22:00:00.000Z",
          stay: { check_in: "2026-09-24", check_out: "2026-09-27", rooms: 5 },
          offer: offerTwo,
          ledger: {
            gross_cents: 153_000,
            inkind_cost_cents: 9_000,
            platform_fee_cents: 4_590,
            net_cents: 139_410,
            ota_net_at_rack_cents: 132_000,
            uplift_vs_ota_cents: 7_410,
          },
        }],
      };
    } else if (path === "/api/v1/tool-calls" && route.request().method() === "GET") {
      body = {
        ok: true,
        human_summary: "Recent WebMCP activity is ready.",
        next_actions: [],
        calls: [{ id: 1, tool: "counter_offer", ok: true, latency_ms: 83, created_at: "2026-09-02T22:00:00.000Z" }],
      };
    } else if (path === "/api/v1/availability") {
      body = {
        ok: true,
        human_summary: "Five Standard rooms are available.",
        next_actions: ["hold_rooms"],
        room_types: [{ code: "standard", available: 7, bar_flex_cents: 11_000 }],
      };
    } else if (path === "/api/v1/holds") {
      body = {
        ok: true,
        human_summary: "Five Standard rooms are held for 15 minutes.",
        next_actions: ["request_offer"],
        hold_id: "11111111-1111-4111-8111-111111111111",
        expires_at: "2099-09-03T12:00:00.000Z",
      };
    } else if (path === "/api/v1/sessions" && route.request().method() === "POST") {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>;
      const existingBooking = requestBody.existing_booking as Record<string, unknown> | undefined;
      if (existingBooking?.refundable === false) {
        body = {
          ok: true,
          human_summary: "The existing booking is non-refundable, so replacing it would risk a double charge.",
          next_actions: ["get_stay_context"],
          result: {
            kind: "not_eligible",
            reason: "ota_nonrefundable",
            explanation: "The existing booking is non-refundable, so replacing it would risk a double charge.",
          },
        };
      } else {
        const responseOffer = existingBooking ? rebookOffer : offerOne;
        body = {
          ok: true,
          human_summary: responseOffer.explanation,
          next_actions: ["counter_offer"],
          session_id: "22222222-2222-4222-8222-222222222222",
          offer: responseOffer,
        };
      }
    } else if (path.endsWith("/counter")) {
      body = {
        ok: true,
        human_summary: offerTwo.explanation,
        next_actions: ["get_offer_status"],
        session_id: "22222222-2222-4222-8222-222222222222",
        offer: offerTwo,
      };
    } else if (path === "/api/v1/checkout/token") {
      body = {
        ok: true,
        human_summary: "Demo checkout opened.",
        next_actions: [],
        checkout_token: "a".repeat(48),
        expires_at: "2099-09-03T12:00:00.000Z",
      };
    } else if (path.endsWith("/accept")) {
      body = {
        ok: true,
        human_summary: "Booking CZ-7F3K is confirmed. No payment was processed.",
        next_actions: ["get_booking"],
        booking_ref: "CZ-7F3K",
        status: "confirmed",
        rooms: 5,
        check_in: "2026-09-24",
        check_out: "2026-09-27",
        total_cents: 153_000,
        tax_cents: 3_000,
        all_in_total_cents: 156_000,
        inclusions: ["breakfast", "late_checkout"],
      };
    } else if (path.includes("/bookings/")) {
      body = {
        ok: true,
        human_summary: "Booking CZ-7F3K is confirmed.",
        next_actions: [],
        booking_ref: "CZ-7F3K",
        all_in_total_cents: 156_000,
      };
    } else if (path.includes("/sessions/")) {
      body = {
        ok: true,
        human_summary: "The negotiated offer is still open.",
        next_actions: ["counter_offer"],
        offer: offerTwo,
        human_only: "The guest must use Accept & pay in the panel.",
      };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPlatform(page);
  await page.goto("/demo?debug=1");
  await expect(page.locator("#parley-kit")).toBeAttached();
});

test("debug shim drives the complete negotiation contract", async ({ page }) => {
  const names = await page.evaluate(() => window.__parleyTools?.list().map((tool) => tool.name));
  expect(names).toEqual([
    "get_negotiation_policy",
    "get_stay_context",
    "set_dates",
    "search_availability",
    "hold_rooms",
    "request_offer",
    "counter_offer",
    "get_offer_status",
    "get_booking",
  ]);

  const call = (name: string, args: Record<string, unknown>) =>
    page.evaluate(
      ({ tool, input }) => window.__parleyTools?.call(tool, input),
      { tool: name, input: args },
    );
  const policy = await call("get_negotiation_policy", {});
  expect((policy?.policy as Record<string, unknown>).negotiable).toBe(true);
  await page.getByLabel("Rooms").fill("1");
  const visibleContext = await call("get_stay_context", {});
  expect((visibleContext?.stay as Record<string, unknown>).rooms).toBe(1);
  const stay = { check_in: "2026-09-24", check_out: "2026-09-27", rooms: 5, guests_per_room: 1 };
  await call("set_dates", stay);
  await call("search_availability", stay);
  const hold = await call("hold_rooms", stay);
  const first = await call("request_offer", {
    hold_id: hold?.hold_id,
    asks: ["breakfast", "late_checkout"],
    payment_preference: "flexible",
  });
  expect((first?.offer as Record<string, unknown>).total_cents).toBe(165_000);
  const second = await call("counter_offer", {
    session_id: first?.session_id,
    target_total_cents: 140_000,
    keep_inclusions: true,
    payment_preference: "prepaid_ok",
  });
  expect((second?.offer as Record<string, unknown>).total_cents).toBe(153_000);
  await expect(page.getByText("€1,560.00").first()).toBeVisible();
  await expect(page.getByText("Your agent").last()).toBeVisible();
  await expect(page.getByText("Casa do Zêzere · policy").last()).toBeVisible();
});

test("a human can complete checkout using buttons without card data", async ({ page }) => {
  await page.getByRole("button", { name: "Check direct availability" }).click();
  await page.getByRole("button", { name: "Hold 5" }).click();
  await page.getByRole("button", { name: "Request breakfast + late checkout" }).click();
  await expect(page.getByText("€1,680.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Counter €1,400 prepaid" }).click();
  await expect(page.getByText("€1,560.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Accept & pay €1,560.00" }).click();
  await expect(page.getByRole("heading", { name: "Confirm the demo booking" })).toBeVisible();
  await expect(page.getByText("no card details collected", { exact: false })).toBeVisible();
  await expect(page.locator('input[autocomplete^="cc-"], input[name*="card" i], input[name="cvc"], input[name="cvv"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "CZ-7F3K" })).toBeVisible();
  await expect(page.getByText("No payment was processed", { exact: false })).toBeVisible();
});

test("rebook guardrails preserve the other booking and reject non-refundable stays", async ({ page }) => {
  const call = (name: string, args: Record<string, unknown>) =>
    page.evaluate(
      ({ tool, input }) => window.__parleyTools?.call(tool, input),
      { tool: name, input: args },
    );
  const stay = { check_in: "2026-10-17", check_out: "2026-10-19", rooms: 1, guests_per_room: 1 };
  await call("set_dates", stay);
  const hold = await call("hold_rooms", stay);
  await expect(page.getByText("Held 1 Standard room for 15 minutes.")).toBeVisible();
  const existingBooking = {
    channel: "Booking.com",
    rate_per_night_cents: 12_000,
    total_cents: 24_000,
    check_in: stay.check_in,
    check_out: stay.check_out,
    refundable: true,
    cancellation_deadline: "2026-10-15T12:00:00.000Z",
  };
  const eligible = await call("request_offer", {
    hold_id: hold?.hold_id,
    asks: ["breakfast"],
    payment_preference: "prepaid_ok",
    existing_booking: existingBooking,
  });
  expect((eligible?.offer as Record<string, unknown>).reasons).toContain("beat_ota");
  expect((eligible?.offer as Record<string, unknown>).explanation).toContain("book here first, then cancel there");
  await expect(page.getByText("Asked the hotel to beat the existing booking with breakfast.")).toBeVisible();

  const blocked = await call("request_offer", {
    hold_id: hold?.hold_id,
    asks: ["breakfast"],
    payment_preference: "prepaid_ok",
    existing_booking: { ...existingBooking, refundable: false },
  });
  expect((blocked?.result as Record<string, unknown>).reason).toBe("ota_nonrefundable");
  expect(blocked?.human_summary).toContain("risk a double charge");
  await expect(page.getByText("Casa do Zêzere · policy").last()).toBeVisible();
});

test("the owner sees the direct-versus-OTA ledger proof", async ({ page }) => {
  await page.goto("/owner");
  await page.getByLabel("Demo passcode").fill("parley-demo-2026");
  await page.getByRole("button", { name: "Open owner view" }).click();
  await expect(page.getByText("+€74.10").first()).toBeVisible();
  await expect(page.getByText("CZ-7F3K")).toBeVisible();
  await expect(page.getByText("counter_offer")).toBeVisible();
});
