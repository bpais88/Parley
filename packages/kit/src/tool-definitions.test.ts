import { describe, expect, it } from "vitest";
import { TOOL_DEFINITIONS } from "./tool-definitions";

const expectedNames = [
  "get_negotiation_policy",
  "get_stay_context",
  "set_dates",
  "search_availability",
  "hold_rooms",
  "request_offer",
  "counter_offer",
  "get_offer_status",
  "get_booking",
];

describe("WebMCP tool manifest", () => {
  it("exposes exactly the focused nine-tool surface", () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual(expectedNames);
    expect(new Set(expectedNames).size).toBe(9);
    expect(expectedNames.every((name) => !/(accept|pay|card|cancel)/i.test(name))).toBe(true);
  });

  it("keeps schemas strict, descriptions useful, and annotations honest", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description.length, tool.name).toBeGreaterThanOrEqual(40);
      expect(tool.inputSchema.type, tool.name).toBe("object");
      expect(tool.inputSchema.additionalProperties, tool.name).toBe(false);
      if (tool.annotations.readOnlyHint) {
        expect(tool.annotations.destructiveHint, tool.name).toBeUndefined();
      } else {
        expect(tool.annotations.destructiveHint, tool.name).toBe(false);
        expect(tool.description, tool.name).toMatch(/updates|places|asks|submits/i);
      }
      expect(JSON.stringify(tool.inputSchema), tool.name).not.toMatch(/card|pan|cvc|cvv/i);
    }
    expect(TOOL_DEFINITIONS.find((tool) => tool.name === "request_offer")?.description).toMatch(
      /refundable OTA booking|confirm direct first|card data/i,
    );
  });
});
