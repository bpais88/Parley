import { and, eq, gt, gte, lt } from "drizzle-orm";
import type { StaySearch } from "@parley/shared";
import type { Database } from "@/db/client";
import { holds, inventory, properties, sessions } from "@/db/schema";
import { DEMO_PROPERTY_SLUG } from "@/lib/demo-policy";

export function stayDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  for (
    let current = Date.parse(`${checkIn}T00:00:00Z`);
    current < end;
    current += 86_400_000
  ) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }
  return dates;
}

export async function demoProperty(db: Database) {
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, DEMO_PROPERTY_SLUG))
    .limit(1);
  return property;
}

export async function expireStale(db: Database, now = new Date()) {
  await db
    .update(holds)
    .set({ status: "expired" })
    .where(and(eq(holds.status, "active"), lt(holds.expiresAt, now)));

  const openSessions = await db
    .select({ id: sessions.id, holdId: sessions.holdId, offer: sessions.currentOffer })
    .from(sessions)
    .where(eq(sessions.status, "open"));

  const expired = openSessions.filter(
    (session) => session.offer && Date.parse(session.offer.expires_at) <= now.getTime(),
  );
  for (const session of expired) {
    await db.update(sessions).set({ status: "expired" }).where(eq(sessions.id, session.id));
    await db.update(holds).set({ status: "expired" }).where(eq(holds.id, session.holdId));
  }
}

export async function availabilityFor(
  db: Database,
  property: typeof properties.$inferSelect,
  stay: StaySearch,
  now = new Date(),
) {
  await expireStale(db, now);
  const dates = stayDates(stay.check_in, stay.check_out);
  const inventoryRows = await db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.propertyId, property.id),
        gte(inventory.stayDate, stay.check_in),
        lt(inventory.stayDate, stay.check_out),
      ),
    );
  const activeHolds = await db
    .select()
    .from(holds)
    .where(
      and(
        eq(holds.propertyId, property.id),
        eq(holds.status, "active"),
        gt(holds.expiresAt, now),
        lt(holds.checkIn, stay.check_out),
        gt(holds.checkOut, stay.check_in),
      ),
    );

  if (inventoryRows.length !== dates.length) {
    return null;
  }

  const byDate = new Map(inventoryRows.map((row) => [row.stayDate, row]));
  const nightly = dates.map((date) => {
    const row = byDate.get(date);
    if (!row) {
      throw new Error(`Missing inventory for ${date}`);
    }
    const held = activeHolds
      .filter((hold) => hold.checkIn <= date && hold.checkOut > date)
      .reduce((total, hold) => total + hold.rooms, 0);
    return {
      date,
      rooms_sold: row.roomsSold,
      rooms_held: held,
      available: property.totalRooms - row.roomsSold - held,
    };
  });
  const minimumAvailable = Math.min(...nightly.map((night) => night.available));
  const occupancyPct = Math.round(
    nightly.reduce((sum, night) => sum + night.rooms_sold / property.totalRooms, 0) /
      nightly.length *
      100,
  );

  return { nightly, minimumAvailable, occupancyPct };
}
