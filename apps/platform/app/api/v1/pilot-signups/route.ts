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
        city: input.city,
        contactEmail: input.contact_email.toLowerCase(),
        website: normalizedWebsite,
        rooms: input.rooms,
        otaCommissionPct: input.ota_commission_pct,
        negotiationRules: input.negotiation_rules,
        contactSettings: input.contact_settings,
      })
      .onConflictDoUpdate({
        target: [pilotSignups.contactEmail, pilotSignups.website],
        set: {
          hotelName: input.hotel_name,
          city: input.city,
          rooms: input.rooms,
          otaCommissionPct: input.ota_commission_pct,
          negotiationRules: input.negotiation_rules,
          contactSettings: input.contact_settings,
        },
      })
      .returning({ id: pilotSignups.id });

    return success(
      "Your hotel setup is saved for the Parley pilot.",
      [],
      { signup_id: inserted[0]?.id },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
