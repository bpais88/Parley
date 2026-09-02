import { describe, expect, it } from "vitest";
import { stayDates } from "./platform-data";

describe("stayDates", () => {
  it("uses property-style half-open calendar dates", () => {
    expect(stayDates("2026-09-24", "2026-09-27")).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
  });
});
