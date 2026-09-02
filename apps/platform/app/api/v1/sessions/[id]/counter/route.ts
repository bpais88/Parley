import { and, eq } from "drizzle-orm";
import { CounterSchema, OfferSchema, RequestSchema } from "@parley/shared";
import { counterOffer } from "@parley/engine";
import { getDatabase } from "@/db/client";
import { holds, offers, sessions } from "@/db/schema";
import { failure, parseJson, routeError, success, visitorId, withinRateLimit } from "@/lib/api";
import { demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`${visitor}:counter`)) {
      return failure("rate_limited", "Too many counters; wait a minute and try again.", 429);
    }
    const counter = await parseJson(request, CounterSchema);
    const { id } = await context.params;
    const db = getDatabase();
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.visitorId, visitor)))
      .limit(1);
    if (!session || session.status !== "open" || !session.currentOffer) {
      return failure("session_not_open", "That negotiation is not open for a counter.", 404);
    }
    if (Date.parse(session.currentOffer.expires_at) <= Date.now()) {
      await db.update(sessions).set({ status: "expired" }).where(eq(sessions.id, session.id));
      await db.update(holds).set({ status: "expired" }).where(eq(holds.id, session.holdId));
      return failure("offer_expired", "That offer expired; request a new hold and offer.", 409);
    }
    const property = await demoProperty(db);
    if (!property || property.id !== session.propertyId) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const negotiationRequest = RequestSchema.parse(session.request);
    const previous = OfferSchema.parse(session.currentOffer);
    const next = counterOffer({
      policy: property.policy,
      request: negotiationRequest,
      occupancy_pct: session.occupancyPct,
      now: new Date().toISOString(),
      previous_offer: previous,
      counter,
    });

    await db
      .update(sessions)
      .set({ currentOffer: next, round: next.round })
      .where(eq(sessions.id, session.id));
    await db.insert(offers).values({
      sessionId: session.id,
      round: next.round,
      payload: next,
    });
    const extendedHold = new Date(Date.parse(next.expires_at) + 5 * 60_000);
    await db
      .update(holds)
      .set({ expiresAt: extendedHold })
      .where(eq(holds.id, session.holdId));

    return success(next.explanation, ["get_offer_status"], {
      session_id: session.id,
      offer: next,
    });
  } catch (error) {
    return routeError(error);
  }
}
