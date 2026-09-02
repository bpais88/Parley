import { getDatabase } from "@/db/client";
import { failure, routeError, success } from "@/lib/api";
import { expireStale } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return failure("cron_unauthorized", "The cron authorization is invalid.", 401);
  }
  try {
    await expireStale(getDatabase());
    return success("Expired holds and offers were closed.", []);
  } catch (error) {
    return routeError(error);
  }
}
