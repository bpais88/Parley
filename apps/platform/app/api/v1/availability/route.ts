import { StaySearchSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { failure, routeError, success, visitorId } from "@/lib/api";
import { availabilityFor, demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await visitorId();
    const url = new URL(request.url);
    const stay = StaySearchSchema.parse({
      check_in: url.searchParams.get("check_in"),
      check_out: url.searchParams.get("check_out"),
      rooms: Number(url.searchParams.get("rooms")),
      guests_per_room: Number(url.searchParams.get("guests_per_room")),
    });
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const availability = await availabilityFor(db, property, stay);
    if (!availability) {
      return failure("dates_unavailable", "Inventory is not loaded for every requested night.", 404);
    }

    const nights = availability.nightly.length;
    const roomNights = stay.rooms * nights;
    const policy = property.policy;
    const flexTotal = policy.bar_flex_cents * roomNights;
    const nrfPerNight = Math.round(
      policy.bar_flex_cents * (1 - policy.nrf_discount_pct / 100),
    );
    const tax =
      policy.city_tax_cents_per_guest_night *
      stay.rooms *
      stay.guests_per_room *
      nights;

    return success(
      availability.minimumAvailable >= stay.rooms
        ? `${stay.rooms} Standard room${stay.rooms === 1 ? " is" : "s are"} available for those dates.`
        : `Only ${Math.max(0, availability.minimumAvailable)} Standard room${availability.minimumAvailable === 1 ? " remains" : "s remain"} for those dates.`,
      availability.minimumAvailable >= stay.rooms ? ["hold_rooms"] : ["set_dates"],
      {
        stay,
        occupancy_pct: availability.occupancyPct,
        room_types: [
          {
            code: "standard",
            available: Math.max(0, availability.minimumAvailable),
            bar_flex_cents: policy.bar_flex_cents,
            nrf_cents: nrfPerNight,
            total_flex_cents: flexTotal,
            total_nrf_cents: nrfPerNight * roomNights,
            city_tax_cents: tax,
            total_flex_with_tax_cents: flexTotal + tax,
            breakfast_cents_per_guest_night: 1_200,
          },
        ],
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
