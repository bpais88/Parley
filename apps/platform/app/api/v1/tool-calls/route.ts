import { and, desc, eq } from "drizzle-orm";
import { ToolCallInputSchema } from "@parley/shared";
import { getDatabase } from "@/db/client";
import { sessions, toolCalls } from "@/db/schema";
import { failure, parseJson, redact, routeError, success, visitorId } from "@/lib/api";
import { demoProperty } from "@/lib/platform-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await visitorId();
    const input = await parseJson(request, ToolCallInputSchema);
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    if (input.session_id) {
      const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, input.session_id), eq(sessions.visitorId, visitor)))
        .limit(1);
      if (!session) {
        return failure("session_not_found", "That session does not belong to this visitor.", 404);
      }
    }

    await db.insert(toolCalls).values({
      propertyId: property.id,
      visitorId: visitor,
      sessionId: input.session_id,
      tool: input.tool,
      args: redact(input.args) as Record<string, unknown>,
      resultSummary: input.result_summary,
      ok: input.ok,
      latencyMs: input.latency_ms,
    });

    return success("Tool activity recorded with personal fields redacted.", [], {}, 201);
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(request: Request) {
  try {
    const configuredPasscode = process.env.OWNER_PASSCODE;
    if (!configuredPasscode || request.headers.get("x-owner-passcode") !== configuredPasscode) {
      return failure("owner_unauthorized", "The owner passcode is incorrect.", 401);
    }
    const db = getDatabase();
    const property = await demoProperty(db);
    if (!property) {
      return failure("property_not_found", "The demo property has not been seeded.", 503);
    }
    const rows = await db
      .select({
        id: toolCalls.id,
        tool: toolCalls.tool,
        args: toolCalls.args,
        result_summary: toolCalls.resultSummary,
        ok: toolCalls.ok,
        latency_ms: toolCalls.latencyMs,
        created_at: toolCalls.createdAt,
      })
      .from(toolCalls)
      .where(eq(toolCalls.propertyId, property.id))
      .orderBy(desc(toolCalls.createdAt))
      .limit(200);

    return success("Recent WebMCP activity is ready.", [], {
      calls: rows.map((row) => ({ ...row, created_at: row.created_at.toISOString() })),
    });
  } catch (error) {
    return routeError(error);
  }
}
