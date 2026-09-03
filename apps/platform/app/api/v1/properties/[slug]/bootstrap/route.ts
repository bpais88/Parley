import { eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { properties } from "@/db/schema";
import { failure, routeError, success, visitorId } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await visitorId();
    const { slug } = await context.params;
    const db = getDatabase();
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.slug, slug))
      .limit(1);

    if (!property) {
      return failure("property_not_found", "That property is not configured.", 404);
    }

    const policy = property.policy;
    return success(
      `${property.name} offers negotiable direct rates with human-only acceptance.`,
      ["get_negotiation_policy", "get_stay_context", "search_availability"],
      {
        property: {
          slug: property.slug,
          name: property.name,
          city: property.city,
          currency: policy.currency,
          timezone: policy.timezone,
        },
        policy: {
          negotiable: true,
          beats_ota_up_to_pct: 12,
          group_threshold_rooms: policy.group_threshold_rooms,
          max_rounds: policy.max_rounds,
          offer_ttl_min: policy.offer_ttl_min,
          hold_ttl_min: policy.hold_ttl_min,
          perks: policy.perks
            .filter((perk) => perk.enabled)
            .map(({ code, label, value_cents: valueCents }) => ({
              code,
              label,
              value_cents: valueCents,
            })),
          human_only: ["accept", "payment", "cancellation_elsewhere"],
        },
        room_types: [
          {
            code: "standard",
            name: "Standard",
            capacity: 4,
            total_rooms: property.totalRooms,
            bar_flex_cents: policy.bar_flex_cents,
            nrf_cents: Math.round(
              policy.bar_flex_cents * (1 - policy.nrf_discount_pct / 100),
            ),
            breakfast_cents_per_guest_night: 1_200,
          },
        ],
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
