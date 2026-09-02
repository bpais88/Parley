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
      body = {
        ok: true,
        human_summary: offerOne.explanation,
        next_actions: ["counter_offer"],
        session_id: "22222222-2222-4222-8222-222222222222",
        result: offerOne,
      };
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
  const stay = { check_in: "2026-09-24", check_out: "2026-09-27", rooms: 5, guests_per_room: 1 };
  await call("set_dates", stay);
  await call("search_availability", stay);
  const hold = await call("hold_rooms", stay);
  const first = await call("request_offer", {
    hold_id: hold?.hold_id,
    asks: ["breakfast", "late_checkout"],
    payment_preference: "flexible",
  });
  expect((first?.result as Record<string, unknown>).total_cents).toBe(165_000);
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
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "CZ-7F3K" })).toBeVisible();
  await expect(page.getByText("No payment was processed", { exact: false })).toBeVisible();
});
