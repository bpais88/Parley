import { getDatabase } from "@/db/client";
import { failure, routeError, success } from "@/lib/api";
import { availabilityFor, demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return failure("database_not_configured", "The database connection is not configured.", 503);
  }

  try {
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("database_not_seeded", "The database is connected but demo data is missing.", 503);
    }
    const checkIn = new Date();
    checkIn.setUTCHours(0, 0, 0, 0);
    const checkOut = new Date(checkIn.getTime() + 60 * 86_400_000);
    const availability = await availabilityFor(db, property, {
      check_in: checkIn.toISOString().slice(0, 10),
      check_out: checkOut.toISOString().slice(0, 10),
      rooms: 1,
      guests_per_room: 1,
    });
    if (!availability) {
      return failure("inventory_incomplete", "The next 60 days of inventory are incomplete.", 503);
    }

    return success("Parley is healthy and the demo inventory is ready.", [], {
      database: "connected",
      property: property.slug,
      inventory_nights_checked: 60,
      minimum_available_rooms: availability.minimumAvailable,
    });
  } catch (error) {
    return routeError(error);
  }
}
