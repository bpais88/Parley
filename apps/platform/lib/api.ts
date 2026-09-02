import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { z } from "zod";

const VISITOR_COOKIE = "parley_visitor";

export function success(
  humanSummary: string,
  nextActions: string[],
  data: Record<string, unknown> = {},
  status = 200,
) {
  return NextResponse.json(
    { ok: true, human_summary: humanSummary, next_actions: nextActions, ...data },
    { status },
  );
}

export function failure(errorCode: string, humanSummary: string, status = 400) {
  return NextResponse.json(
    { ok: false, error_code: errorCode, human_summary: humanSummary },
    { status },
  );
}

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  return schema.parse(await request.json());
}

export async function visitorId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value;
  if (existing) {
    return existing;
  }

  const created = randomBytes(24).toString("base64url");
  cookieStore.set(VISITOR_COOKIE, created, {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return created;
}

export function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bookingReference(): string {
  return `CZ-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const normalized = key.toLowerCase();
        if (
          normalized.includes("email") ||
          normalized.includes("name") ||
          normalized.includes("card")
        ) {
          return [key, "[redacted]"];
        }
        return [key, redact(entry)];
      }),
    );
  }
  return value;
}

const rateBuckets = new Map<string, { count: number; resetsAt: number }>();

export function withinRateLimit(key: string, limit = 30, now = Date.now()): boolean {
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetsAt <= now) {
    rateBuckets.set(key, { count: 1, resetsAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
}

export function routeError(error: unknown) {
  if (error instanceof SyntaxError) {
    return failure("invalid_json", "The request body is not valid JSON.");
  }
  if (error && typeof error === "object" && "issues" in error) {
    return failure("invalid_input", "The request does not match the required schema.");
  }

  console.error("Parley API error", error);
  return failure("service_unavailable", "Parley could not complete that request right now.", 503);
}
