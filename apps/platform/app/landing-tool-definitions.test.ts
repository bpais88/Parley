import { describe, expect, it } from "vitest";
import { PilotSignupInputSchema } from "@parley/shared";
import { LANDING_TOOL_DEFINITIONS } from "./landing-tool-definitions";

describe("Parley landing-page WebMCP tools", () => {
  it("exposes a focused eight-tool hotel onboarding surface", () => {
    expect(LANDING_TOOL_DEFINITIONS).toHaveLength(8);
    expect(new Set(LANDING_TOOL_DEFINITIONS.map((tool) => tool.name)).size).toBe(8);
    expect(LANDING_TOOL_DEFINITIONS.every((tool) => tool.description.length >= 80)).toBe(true);
    expect(
      LANDING_TOOL_DEFINITIONS.every(
        (tool) => tool.inputSchema.type === "object" && tool.inputSchema.additionalProperties === false,
      ),
    ).toBe(true);
  });

  it("keeps enrollment and website publication outside the tool surface", () => {
    const names = LANDING_TOOL_DEFINITIONS.map((tool) => tool.name).join(" ");
    expect(names).not.toMatch(/submit|publish|activate|enroll/);
    expect(
      LANDING_TOOL_DEFINITIONS.find((tool) => tool.name === "prepare_pilot_signup")
        ?.description,
    ).toContain("never submits");
  });

  it("requires explicit consent before the API accepts a pilot request", () => {
    const request = {
      hotel_name: "Harbour House",
      contact_email: "owner@harbour.example",
      website: "https://harbour.example",
      rooms: 32,
      ota_commission_pct: 18,
    };

    expect(PilotSignupInputSchema.safeParse(request).success).toBe(false);
    expect(
      PilotSignupInputSchema.safeParse({ ...request, consent_to_contact: true }).success,
    ).toBe(true);
    expect(
      PilotSignupInputSchema.safeParse({ ...request, consent_to_contact: false }).success,
    ).toBe(false);
  });
});
