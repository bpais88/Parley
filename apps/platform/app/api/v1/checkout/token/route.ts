import { and, eq } from "drizzle-orm";
import { CheckoutTokenInputSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { checkoutTokens, sessions } from "@/db/schema";
import { failure, opaqueToken, parseJson, routeError, success, tokenHash, visitorId, withinRateLimit } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await visitorId();
    if (!withinRateLimit(`${visitor}:checkout-token`, 10)) {
      return failure("rate_limited", "Too many checkout attempts; wait a minute and try again.", 429);
    }
    const input = await parseJson(request, CheckoutTokenInputSchema);
    const db = getDatabase();
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, input.session_id),
          eq(sessions.visitorId, visitor),
          eq(sessions.status, "open"),
        ),
      )
      .limit(1);
    if (!session?.currentOffer) {
      return failure("session_not_open", "No open offer is available for checkout.", 404);
    }
    const offerExpiry = Date.parse(session.currentOffer.expires_at);
    if (offerExpiry <= Date.now()) {
      return failure("offer_expired", "The offer expired before checkout opened.", 409);
    }

    const token = opaqueToken();
    const expiresAt = new Date(Math.min(offerExpiry, Date.now() + 5 * 60_000));
    await db.insert(checkoutTokens).values({
      tokenHash: tokenHash(token),
      sessionId: session.id,
      visitorId: visitor,
      expiresAt,
    });
    await db
      .update(sessions)
      .set({ checkoutOpened: true })
      .where(eq(sessions.id, session.id));

    return success(
      "Demo checkout opened. This token can confirm only the current offer and carries no card data.",
      [],
      { checkout_token: token, expires_at: expiresAt.toISOString() },
      201,
    );
  } catch (error) {
    return routeError(error);
  }
}
