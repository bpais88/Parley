import { and, eq } from "drizzle-orm";
import { RequestSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { bookings, sessions } from "@/db/schema";
import { failure, routeError, success, visitorId } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  try {
    const visitor = await visitorId();
    const { ref } = await context.params;
    const db = getDatabase();
    const [booking] = await db
      .select({ booking: bookings, request: sessions.request })
      .from(bookings)
      .innerJoin(sessions, eq(bookings.sessionId, sessions.id))
      .where(and(eq(bookings.ref, ref), eq(bookings.visitorId, visitor)))
      .limit(1);
    if (!booking) {
      return failure("booking_not_found", "That booking was not found for this visitor.", 404);
    }
    const stay = RequestSchema.parse(booking.request);
    const offer = booking.booking.offer;

    return success(`Booking ${booking.booking.ref} is ${booking.booking.status}.`, [], {
      booking_ref: booking.booking.ref,
      status: booking.booking.status,
      rooms: stay.rooms,
      check_in: stay.check_in,
      check_out: stay.check_out,
      total_cents: offer.total_cents,
      tax_cents: offer.tax_cents,
      all_in_total_cents: offer.all_in_total_cents,
      inclusions: offer.inclusions,
      payment_terms: offer.payment_terms,
      cancellation_terms: offer.cancellation_terms,
    });
  } catch (error) {
    return routeError(error);
  }
}
