import { describe, expect, it } from "vitest";
import { pingTool } from "./ping-tool";

describe("Gate 0 ping tool", () => {
  it("has a strict empty schema and returns the expected result envelope", async () => {
    expect(pingTool.inputSchema).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    expect(pingTool.annotations).toEqual({ readOnlyHint: true });
    await expect(pingTool.execute()).resolves.toEqual({
      ok: true,
      human_summary: "pong from Parley",
      next_actions: [],
    });
  });
});
