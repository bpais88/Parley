import { describe, expect, it } from "vitest";
import { redact, tokenHash, withinRateLimit } from "./api";

describe("API safety helpers", () => {
  it("redacts personal and card-shaped fields recursively", () => {
    expect(
      redact({
        guest_email: "guest@example.com",
        nested: { guestName: "Guest", card_number: "4242" },
        dates: ["2026-09-24"],
      }),
    ).toEqual({
      guest_email: "[redacted]",
      nested: { guestName: "[redacted]", card_number: "[redacted]" },
      dates: ["2026-09-24"],
    });
  });

  it("hashes checkout tokens without returning the source token", () => {
    const hash = tokenHash("a-secure-demo-token");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("a-secure-demo-token");
  });

  it("enforces a fixed-window write limit", () => {
    const key = `test-${Math.random()}`;
    expect(withinRateLimit(key, 2, 1_000)).toBe(true);
    expect(withinRateLimit(key, 2, 1_001)).toBe(true);
    expect(withinRateLimit(key, 2, 1_002)).toBe(false);
    expect(withinRateLimit(key, 2, 61_000)).toBe(true);
  });
});
