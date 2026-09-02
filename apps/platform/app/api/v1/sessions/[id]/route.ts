import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { holds, sessions } from "@/db/schema";
import { failure, routeError, success, visitorId } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const visitor = await visitorId();
    const { id } = await context.params;
    const db = getDatabase();
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.visitorId, visitor)))
      .limit(1);
    if (!session) {
      return failure("session_not_found", "That negotiation was not found for this visitor.", 404);
    }
    const [hold] = await db
      .select({ status: holds.status, expiresAt: holds.expiresAt })
      .from(holds)
      .where(eq(holds.id, session.holdId))
      .limit(1);
    let status = session.status;
    if (
      status === "open" &&
      session.currentOffer &&
      Date.parse(session.currentOffer.expires_at) <= Date.now()
    ) {
      status = "expired";
      await db.update(sessions).set({ status }).where(eq(sessions.id, session.id));
      await db.update(holds).set({ status: "expired" }).where(eq(holds.id, session.holdId));
    }

    return success(
      status === "open" ? "The negotiated offer is still open." : `The negotiation is ${status}.`,
      status === "open" ? ["counter_offer"] : ["get_stay_context"],
      {
        session_id: session.id,
        status,
        round: session.round,
        offer: session.currentOffer,
        hold: hold
          ? { status: status === "expired" ? "expired" : hold.status, expires_at: hold.expiresAt.toISOString() }
          : null,
        human_only:
          "The guest must use Accept & pay in the panel; there is no WebMCP tool for acceptance or payment.",
        checkout_opened: session.checkoutOpened,
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
