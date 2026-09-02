import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  DEMO_POLICY,
  DEMO_PROPERTY_SLUG,
  DEMO_PUBLIC_KEY,
  DEMO_TOTAL_ROOMS,
} from "../lib/demo-policy";
import { inventory, properties } from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL before running pnpm seed");
}

const db = drizzle(databaseUrl);

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roomsSoldFor(dateString: string): number {
  if (dateString >= "2026-09-24" && dateString < "2026-09-27") {
    return 5;
  }
  if (dateString >= "2026-10-10" && dateString < "2026-10-12") {
    return 11;
  }

  const weekday = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return weekday === 5 || weekday === 6 ? 8 : 5;
}

await db
  .insert(properties)
  .values({
    slug: DEMO_PROPERTY_SLUG,
    publicKey: DEMO_PUBLIC_KEY,
    name: DEMO_POLICY.property_name,
    city: "Ferreira do Zêzere, Portugal",
    policy: DEMO_POLICY,
    totalRooms: DEMO_TOTAL_ROOMS,
  })
  .onConflictDoUpdate({
    target: properties.slug,
    set: {
      publicKey: DEMO_PUBLIC_KEY,
      name: DEMO_POLICY.property_name,
      city: "Ferreira do Zêzere, Portugal",
      policy: DEMO_POLICY,
      totalRooms: DEMO_TOTAL_ROOMS,
    },
  });

const [property] = await db
  .select({ id: properties.id })
  .from(properties)
  .where(eq(properties.slug, DEMO_PROPERTY_SLUG))
  .limit(1);

if (!property) {
  throw new Error("Demo property upsert did not return a readable row");
}

const start = new Date("2026-09-01T00:00:00Z");
const rows = Array.from({ length: 120 }, (_, offset) => {
  const current = new Date(start.getTime() + offset * 86_400_000);
  const stayDate = isoDate(current);
  return {
    propertyId: property.id,
    stayDate,
    roomsSold: roomsSoldFor(stayDate),
  };
});

await db
  .insert(inventory)
  .values(rows)
  .onConflictDoUpdate({
    target: [inventory.propertyId, inventory.stayDate],
    set: { roomsSold: sql`excluded.rooms_sold` },
  });

console.info(`Seeded ${rows.length} nights for ${DEMO_POLICY.property_name}.`);
