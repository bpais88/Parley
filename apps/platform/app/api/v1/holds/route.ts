import { sql } from "drizzle-orm";
import { HoldRoomsInputSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { failure, parseJson, routeError, success, visitorId, withinRateLimit } from "@/lib/api";
import { demoProperty, stayDates } from "@/lib/platform-data";

export const runtime = "nodejs";

type CreatedHold = {
  hold_id: string;
  hold_expires_at: Date;
};

export async function POST(request: Request) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`${visitor}:hold`)) {
      return failure("rate_limited", "Too many hold attempts; wait a minute and try again.", 429);
    }
    const stay = await parseJson(request, HoldRoomsInputSchema);
    if (stayDates(stay.check_in, stay.check_out).length > 14) {
      return failure("stay_too_long", "A hold can cover at most 14 nights.");
    }
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const blackout = property.policy.blackouts.some(
      (range) => stay.check_in < range.date_to && stay.check_out > range.date_from,
    );
    if (blackout) {
      return failure("blackout", "Those dates require owner review and cannot be held automatically.");
    }

    const expiresAt = new Date(Date.now() + property.policy.hold_ttl_min * 60_000);
    const result = await db.execute<CreatedHold>(sql`
      select * from parley_create_hold(
        ${property.id}::uuid,
        ${visitor}::text,
        ${stay.check_in}::date,
        ${stay.check_out}::date,
        ${stay.rooms}::integer,
        ${stay.guests_per_room}::integer,
        ${expiresAt.toISOString()}::timestamptz
      )
    `);
    const created = result.rows[0];
    if (!created) {
      return failure("not_available", "Those rooms are no longer available to hold.", 409);
    }

    return success(
      `${stay.rooms} Standard rooms are held for ${property.policy.hold_ttl_min} minutes.`,
      ["request_offer"],
      {
        hold_id: created.hold_id,
        expires_at: new Date(created.hold_expires_at).toISOString(),
        stay,
      },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
