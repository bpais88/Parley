import { PilotSignupInputSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { pilotSignups } from "@/db/schema";
import {
  failure,
  parseJson,
  routeError,
  success,
  visitorId,
  withinRateLimit,
} from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`pilot-signup:${visitor}`, 5)) {
      return failure(
        "rate_limited",
        "Too many pilot requests were submitted. Please try again in a minute.",
        429,
      );
    }

    const input = await parseJson(request, PilotSignupInputSchema);
    const normalizedWebsite = new URL(input.website).toString().replace(/\/$/, "");
    const db = getDatabase();
    const inserted = await db
      .insert(pilotSignups)
      .values({
        visitorId: visitor,
        hotelName: input.hotel_name,
        contactEmail: input.contact_email.toLowerCase(),
        website: normalizedWebsite,
        rooms: input.rooms,
        otaCommissionPct: input.ota_commission_pct,
      })
      .onConflictDoNothing()
      .returning({ id: pilotSignups.id });

    const alreadyRegistered = inserted.length === 0;
    return success(
      alreadyRegistered
        ? "This hotel is already on the Parley pilot list."
        : "Your hotel is on the Parley pilot list.",
      [],
      { already_registered: alreadyRegistered },
      alreadyRegistered ? 200 : 201,
    );
  } catch (error) {
    return routeError(error);
  }
}
