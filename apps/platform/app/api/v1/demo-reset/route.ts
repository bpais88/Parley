import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  bookings,
  checkoutTokens,
  holds,
  inventory,
  ledger,
  offers,
  sessions,
} from "@/db/schema";
import { failure, routeError, success } from "@/lib/api";
import { demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

async function resetDemo(request: Request) {
  const ownerAuthorized =
    Boolean(process.env.OWNER_PASSCODE) &&
    request.headers.get("x-owner-passcode") === process.env.OWNER_PASSCODE;
  const cronAuthorized =
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!ownerAuthorized && !cronAuthorized) {
    return failure("reset_unauthorized", "The reset authorization is invalid.", 401);
  }

  try {
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }

    await db.delete(ledger).where(eq(ledger.propertyId, property.id));
    await db.delete(bookings).where(eq(bookings.propertyId, property.id));
    const propertySessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.propertyId, property.id));
    const sessionIds = propertySessions.map((session) => session.id);
    if (sessionIds.length > 0) {
      await db.delete(checkoutTokens).where(inArray(checkoutTokens.sessionId, sessionIds));
      await db.delete(offers).where(inArray(offers.sessionId, sessionIds));
    }
    await db.delete(sessions).where(eq(sessions.propertyId, property.id));
    await db.delete(holds).where(eq(holds.propertyId, property.id));
    await db.execute(sql`
      update ${inventory}
      set ${inventory.roomsSold} = case
        when ${inventory.stayDate} >= '2026-09-24'::date
          and ${inventory.stayDate} < '2026-09-27'::date then 5
        when ${inventory.stayDate} >= '2026-10-10'::date
          and ${inventory.stayDate} < '2026-10-12'::date then 11
        when extract(dow from ${inventory.stayDate}) in (5, 6) then 8
        else 5
      end
      where ${inventory.propertyId} = ${property.id}::uuid
    `);

    return success("The demo inventory and negotiation state were reset.", []);
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(request: Request) {
  return resetDemo(request);
}

export async function POST(request: Request) {
  return resetDemo(request);
}
