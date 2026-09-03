export type LandingJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
};

export type LandingToolDefinition = {
  name: string;
  description: string;
  inputSchema: LandingJsonSchema;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint?: false;
  };
};

const read = { readOnlyHint: true } as const;
const write = { readOnlyHint: false, destructiveHint: false } as const;

const hotelProfileProperties = {
  hotel_name: { type: "string", minLength: 2, maxLength: 120 },
  website: { type: "string", format: "uri", maxLength: 500 },
  city: { type: "string", minLength: 2, maxLength: 120 },
  rooms: { type: "integer", minimum: 1, maximum: 2000 },
  ota_commission_pct: { type: "integer", minimum: 0, maximum: 40 },
  contact_email: { type: "string", format: "email", maxLength: 254 },
};

export const LANDING_TOOL_DEFINITIONS: LandingToolDefinition[] = [
  {
    name: "get_parley_overview",
    description:
      "Explains how Parley makes a hotel website negotiable for guest agents, what is live today, and which onboarding action to take next. Use it when a hotelier or their agent first reaches this page; it changes nothing.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: read,
  },
  {
    name: "get_hotel_onboarding_context",
    description:
      "Reads the hotel profile, generated integration asset, and pilot-signup state currently visible in the shared setup studio. Use it before changing the setup; it changes nothing and never submits a signup.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: read,
  },
  {
    name: "estimate_direct_booking_upside",
    description:
      "Estimates how much OTA commission a hotel could recover by shifting a stated share of annual OTA revenue to direct bookings. Use it for an indicative business case; it changes nothing and returns transparent assumptions, not a guarantee.",
    inputSchema: {
      type: "object",
      properties: {
        annual_ota_revenue_eur: { type: "number", minimum: 1000, maximum: 1000000000 },
        ota_commission_pct: { type: "number", minimum: 0, maximum: 40 },
        shift_to_direct_pct: { type: "number", minimum: 1, maximum: 100 },
      },
      required: ["annual_ota_revenue_eur", "ota_commission_pct", "shift_to_direct_pct"],
      additionalProperties: false,
    },
    annotations: read,
  },
  {
    name: "set_hotel_profile",
    description:
      "Fills the visible setup studio with a hotel's public profile and commercial baseline. Use it when the hotelier supplies these details; it changes only shared page fields, stores nothing, and does not enroll the hotel.",
    inputSchema: {
      type: "object",
      properties: hotelProfileProperties,
      required: ["hotel_name", "website", "city", "rooms", "ota_commission_pct"],
      additionalProperties: false,
    },
    annotations: write,
  },
  {
    name: "show_level0_manifest",
    description:
      "Generates and reveals a copy-ready /.well-known/negotiate.json manifest from the hotel profile shown on this page. Use it for immediate agent discovery; it changes the visible code preview but does not publish or modify the hotel's website.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: write,
  },
  {
    name: "show_install_snippet",
    description:
      "Generates and reveals the one-script Parley installation snippet for the hotel profile shown on this page. Use it to prepare developer handoff; it changes the visible code preview but does not install code or activate a property.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: write,
  },
  {
    name: "prepare_pilot_signup",
    description:
      "Fills the visible pilot-access form with the hotel's contact details and scrolls it into view. Use it when the hotelier asks to join; it changes only page fields and never submits—an authorized person must check consent and press Request pilot access.",
    inputSchema: {
      type: "object",
      properties: hotelProfileProperties,
      required: ["hotel_name", "website", "city", "rooms", "ota_commission_pct", "contact_email"],
      additionalProperties: false,
    },
    annotations: write,
  },
  {
    name: "get_pilot_signup_status",
    description:
      "Reads whether the pilot form is prepared or has been submitted by a human on this page. Use it after helping with setup; it changes nothing and reiterates that enrollment requires the visible human consent and button.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: read,
  },
];
