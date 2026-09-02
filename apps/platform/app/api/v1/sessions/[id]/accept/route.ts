import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { AcceptOfferInputSchema, OfferSchema, RequestSchema } from "@parley/shared";
import { ledgerFor } from "@parley/engine";
import { getDatabase } from "@/db/client";
import {
  bookings,
  checkoutTokens,
  holds,
  inventory,
  ledger,
  sessions,
} from "@/db/schema";
import {
  bookingReference,
  failure,
  parseJson,
  routeError,
  success,
  tokenHash,
  visitorId,
  withinRateLimit,
} from "@/lib/api";
import { demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`${visitor}:accept`, 10)) {
      return failure("rate_limited", "Too many acceptance attempts; wait a minute and try again.", 429);
    }
    const input = await parseJson(request, AcceptOfferInputSchema);
    const { id } = await context.params;
    const db = getDatabase();
    const now = new Date();
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, id),
          eq(sessions.visitorId, visitor),
          eq(sessions.status, "open"),
        ),
      )
      .limit(1);
    if (!session?.currentOffer) {
      return failure("session_not_open", "No open offer is available to accept.", 404);
    }
    const offer = OfferSchema.parse(session.currentOffer);
    if (Date.parse(offer.expires_at) <= now.getTime()) {
      return failure("offer_expired", "The offer expired before it could be accepted.", 409);
    }
    const [checkoutToken] = await db
      .select()
      .from(checkoutTokens)
      .where(
        and(
          eq(checkoutTokens.tokenHash, tokenHash(input.checkout_token)),
          eq(checkoutTokens.sessionId, session.id),
          eq(checkoutTokens.visitorId, visitor),
          isNull(checkoutTokens.usedAt),
          gt(checkoutTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (!checkoutToken) {
      return failure(
        "checkout_token_invalid",
        "Open the visible checkout panel again before confirming this offer.",
        403,
      );
    }
    const property = await demoProperty(db);
    if (!property || property.id !== session.propertyId) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const negotiationRequest = RequestSchema.parse(session.request);
    const bookingId = randomUUID();
    const reference = bookingReference();
    const ledgerPayload = ledgerFor(property.policy, negotiationRequest, offer);

    await db.batch([
      db
        .update(checkoutTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(checkoutTokens.tokenHash, checkoutToken.tokenHash),
            isNull(checkoutTokens.usedAt),
          ),
        ),
      db.insert(bookings).values({
        id: bookingId,
        ref: reference,
        propertyId: property.id,
        sessionId: session.id,
        visitorId: visitor,
        guestName: input.guest_name,
        guestEmail: input.guest_email,
        offer,
      }),
      db.insert(ledger).values({
        bookingId,
        propertyId: property.id,
        payload: ledgerPayload,
      }),
      db
        .update(inventory)
        .set({ roomsSold: sql`${inventory.roomsSold} + ${negotiationRequest.rooms}` })
        .where(
          and(
            eq(inventory.propertyId, property.id),
            sql`${inventory.stayDate} >= ${negotiationRequest.check_in}::date`,
            sql`${inventory.stayDate} < ${negotiationRequest.check_out}::date`,
          ),
        ),
      db.update(sessions).set({ status: "accepted" }).where(eq(sessions.id, session.id)),
      db.update(holds).set({ status: "converted" }).where(eq(holds.id, session.holdId)),
    ]);

    return success(
      `Booking ${reference} is confirmed. No payment was processed.`,
      ["get_booking"],
      {
        booking_ref: reference,
        status: "confirmed",
        rooms: negotiationRequest.rooms,
        check_in: negotiationRequest.check_in,
        check_out: negotiationRequest.check_out,
        total_cents: offer.total_cents,
        tax_cents: offer.tax_cents,
        all_in_total_cents: offer.all_in_total_cents,
        inclusions: offer.inclusions,
        terms: {
          payment: offer.payment_terms,
          cancellation: offer.cancellation_terms,
        },
        ledger: ledgerPayload,
      },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
