import { and, count, eq, gt } from "drizzle-orm";
import { RequestOfferInputSchema, RequestSchema } from "@parley/shared";
import { roundOneOffer } from "@parley/engine";
import { getDatabase } from "@/db/client";
import { holds, offers, sessions } from "@/db/schema";
import { failure, parseJson, routeError, success, visitorId, withinRateLimit } from "@/lib/api";
import { availabilityFor, demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`${visitor}:offer`)) {
      return failure("rate_limited", "Too many offer requests; wait a minute and try again.", 429);
    }
    const input = await parseJson(request, RequestOfferInputSchema);
    const db = getDatabase();
    const now = new Date();
    const [hold] = await db
      .select()
      .from(holds)
      .where(
        and(
          eq(holds.id, input.hold_id),
          eq(holds.visitorId, visitor),
          eq(holds.status, "active"),
          gt(holds.expiresAt, now),
        ),
      )
      .limit(1);
    if (!hold) {
      return failure("hold_not_active", "That hold is missing, expired, or belongs to another visitor.", 404);
    }

    const [{ activeSessions }] = await db
      .select({ activeSessions: count() })
      .from(sessions)
      .where(and(eq(sessions.visitorId, visitor), eq(sessions.status, "open")));
    if (activeSessions >= 5) {
      return failure("session_limit", "Finish or let an existing negotiation expire before starting another.", 429);
    }

    if (
      input.existing_booking &&
      (input.existing_booking.check_in !== hold.checkIn ||
        input.existing_booking.check_out !== hold.checkOut)
    ) {
      return failure("booking_dates_mismatch", "The existing booking dates must match the held stay.");
    }

    const property = await demoProperty(db);
    if (!property || property.id !== hold.propertyId) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const negotiationRequest = RequestSchema.parse({
      check_in: hold.checkIn,
      check_out: hold.checkOut,
      rooms: hold.rooms,
      guests_per_room: hold.guestsPerRoom,
      asks: input.asks,
      payment_preference: input.payment_preference,
      notes: input.notes,
      existing_booking: input.existing_booking,
    });
    const availability = await availabilityFor(db, property, {
      check_in: hold.checkIn,
      check_out: hold.checkOut,
      rooms: hold.rooms,
      guests_per_room: hold.guestsPerRoom,
    }, now);
    if (!availability) {
      return failure("inventory_missing", "Inventory is not loaded for every held night.", 503);
    }

    const result = roundOneOffer({
      policy: property.policy,
      request: negotiationRequest,
      occupancy_pct: availability.occupancyPct,
      now: now.toISOString(),
    });
    if (result.kind === "not_eligible") {
      return success(result.explanation, ["get_stay_context"], { result });
    }

    const [session] = await db
      .insert(sessions)
      .values({
        propertyId: property.id,
        holdId: hold.id,
        visitorId: visitor,
        request: negotiationRequest,
        occupancyPct: availability.occupancyPct,
        round: result.kind === "offer" ? result.round : 1,
        status: result.kind === "offer" ? "open" : "needs_owner",
        currentOffer: result.kind === "offer" ? result : null,
      })
      .returning({ id: sessions.id });
    if (!session) {
      throw new Error("Session insert did not return an id");
    }

    if (result.kind === "offer") {
      await db.insert(offers).values({
        sessionId: session.id,
        round: result.round,
        payload: result,
      });
      const extendedHold = new Date(Date.parse(result.expires_at) + 5 * 60_000);
      if (extendedHold > hold.expiresAt) {
        await db.update(holds).set({ expiresAt: extendedHold }).where(eq(holds.id, hold.id));
      }
    }

    return success(
      result.explanation,
      result.kind === "offer" ? ["get_offer_status", "counter_offer"] : ["get_offer_status"],
      result.kind === "offer"
        ? { session_id: session.id, offer: result }
        : { session_id: session.id, result },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
