import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { bookings, ledger, sessions } from "@/db/schema";
import { failure, routeError, success } from "@/lib/api";
import { demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const configuredPasscode = process.env.OWNER_PASSCODE;
    if (!configuredPasscode) {
      return failure("owner_not_configured", "OWNER_PASSCODE is not configured.", 503);
    }
    if (request.headers.get("x-owner-passcode") !== configuredPasscode) {
      return failure("owner_unauthorized", "The owner passcode is incorrect.", 401);
    }
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const rows = await db
      .select({
        ref: bookings.ref,
        status: bookings.status,
        createdAt: bookings.createdAt,
        offer: bookings.offer,
        request: sessions.request,
        ledger: ledger.payload,
      })
      .from(ledger)
      .innerJoin(bookings, eq(ledger.bookingId, bookings.id))
      .innerJoin(sessions, eq(bookings.sessionId, sessions.id))
      .where(eq(ledger.propertyId, property.id))
      .orderBy(desc(ledger.createdAt))
      .limit(100);
    const totals = rows.reduce(
      (sum, row) => ({
        bookings: sum.bookings + 1,
        gross_cents: sum.gross_cents + row.ledger.gross_cents,
        net_cents: sum.net_cents + row.ledger.net_cents,
        uplift_vs_ota_cents:
          sum.uplift_vs_ota_cents + row.ledger.uplift_vs_ota_cents,
      }),
      { bookings: 0, gross_cents: 0, net_cents: 0, uplift_vs_ota_cents: 0 },
    );

    return success(
      `${totals.bookings} direct demo bookings have produced €${(totals.uplift_vs_ota_cents / 100).toFixed(2)} versus OTA rack economics.`,
      [],
      {
        totals,
        bookings: rows.map((row) => ({
          booking_ref: row.ref,
          status: row.status,
          created_at: row.createdAt.toISOString(),
          stay: {
            check_in: row.request.check_in,
            check_out: row.request.check_out,
            rooms: row.request.rooms,
          },
          offer: row.offer,
          ledger: row.ledger,
        })),
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
