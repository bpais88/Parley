"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  HotelContactSettings,
  HotelNegotiationRules,
} from "@parley/shared";
import {
  LANDING_TOOL_DEFINITIONS,
  type LandingToolDefinition,
} from "./landing-tool-definitions";
import styles from "./page.module.css";

type JsonObject = Record<string, unknown>;
type ToolResult = JsonObject & { ok: boolean; human_summary: string };
type HotelProfile = {
  hotel_name: string;
  website: string;
  city: string;
  rooms: number;
  ota_commission_pct: number;
  contact_email: string;
};
type Preview = "level0" | "script";
type Activity = { tool: string; ok: boolean; summary: string };
type RegistrationStatus = "checking" | "ready" | "ordinary" | "failed";
type PilotStatus = "idle" | "prepared" | "submitting" | "submitted" | "error";
type RegisteredLandingTool = LandingToolDefinition & {
  execute: (args: JsonObject) => Promise<ToolResult>;
};
type LandingModelContext = {
  registerTool: (tool: RegisteredLandingTool) => void | Promise<void>;
};

const DEFAULT_PROFILE: HotelProfile = {
  hotel_name: "Riverside House",
  website: "https://hotel.example",
  city: "Your destination",
  rooms: 24,
  ota_commission_pct: 18,
  contact_email: "",
};

const DEFAULT_RULES: HotelNegotiationRules = {
  min_hotel_uplift_pct: 5,
  quiet_dates_max_discount_pct: 12,
  preferred_perks: ["breakfast", "late_checkout"],
  owner_review_above_rooms: 8,
  prepay_required_over_discount_pct: 5,
  voice: "Warm, brief and welcoming",
};

const DEFAULT_CONTACT_SETTINGS: HotelContactSettings = {
  guest_contact_policy: "do_not_collect",
};

const DEFAULT_POLICY_BRIEF =
  "On quiet dates, offer breakfast and late checkout before lowering the price. Never leave me worse off than an OTA booking. Ask me before agreeing to groups above 8 rooms, and require prepayment for the deepest discounts.";

let registration: Promise<void> | undefined;
let activeRunner:
  | ((name: string, args: JsonObject) => Promise<ToolResult>)
  | undefined;

const errorResult = (humanSummary: string): ToolResult => ({
  ok: false,
  error_code: "invalid_arguments",
  human_summary: humanSummary,
});

const requiredString = (args: JsonObject, key: string) => {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const optionalString = (args: JsonObject, key: string) => {
  const value = args[key];
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error(`${key} must be a string.`);
  return value.trim();
};

const requiredNumber = (args: JsonObject, key: string) => {
  const value = args[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }
  return value;
};

const requiredStringArray = (args: JsonObject, key: string): string[] => {
  const value = args[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${key} must be a list of choices.`);
  }
  return value as string[];
};

const requiredPerks = (
  args: JsonObject,
): HotelNegotiationRules["preferred_perks"] => {
  const values = requiredStringArray(args, "preferred_perks");
  const allowed = new Set([
    "breakfast",
    "late_checkout",
    "early_checkin",
    "upgrade",
    "parking",
  ]);
  if (!values.every((value) => allowed.has(value))) {
    throw new Error("preferred_perks contains an unsupported perk.");
  }
  return values as HotelNegotiationRules["preferred_perks"];
};

const euro = (value: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const friendlyPerk = (perk: string) => perk.replaceAll("_", " ");

const ruleSummary = (rules: HotelNegotiationRules) =>
  `Keep at least ${rules.min_hotel_uplift_pct}% more than an OTA booking; discount up to ${rules.quiet_dates_max_discount_pct}% on quiet dates; offer ${rules.preferred_perks.map(friendlyPerk).join(" and ") || "no automatic perks"}; ask the owner above ${rules.owner_review_above_rooms} rooms; require prepayment for discounts over ${rules.prepay_required_over_discount_pct}%.`;

function registerLandingTools(modelContext: LandingModelContext) {
  if (!registration) {
    registration = Promise.all(
      LANDING_TOOL_DEFINITIONS.map((definition) =>
        Promise.resolve(
          modelContext.registerTool({
            ...definition,
            execute: async (args) =>
              activeRunner
                ? activeRunner(definition.name, args)
                : {
                    ok: false,
                    error_code: "page_not_ready",
                    human_summary: "The Parley setup studio is not ready yet.",
                  },
          }),
        ),
      ),
    ).then(() => undefined);
  }
  return registration;
}

export default function HotelOnboarding() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const profileRef = useRef(profile);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const rulesRef = useRef(rules);
  const [contactSettings, setContactSettings] = useState(DEFAULT_CONTACT_SETTINGS);
  const contactSettingsRef = useRef(contactSettings);
  const [policyBrief, setPolicyBrief] = useState(DEFAULT_POLICY_BRIEF);
  const [preview, setPreview] = useState<Preview>("level0");
  const previewRef = useRef(preview);
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus>("checking");
  const [pilotStatus, setPilotStatus] = useState<PilotStatus>("idle");
  const pilotStatusRef = useRef(pilotStatus);
  const [consent, setConsent] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [copied, setCopied] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  useEffect(() => {
    contactSettingsRef.current = contactSettings;
  }, [contactSettings]);
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  useEffect(() => {
    pilotStatusRef.current = pilotStatus;
  }, [pilotStatus]);

  const level0Manifest = useMemo(() => {
    const channels: Record<string, string | boolean> = { webmcp: true };
    if (
      contactSettings.guest_contact_policy === "ask_each_time" &&
      contactSettings.enquiry_inbox
    ) {
      channels.consent_based_enquiries = contactSettings.enquiry_inbox;
    }
    return JSON.stringify(
      {
        version: "0.1",
        negotiable: true,
        property: {
          name: profile.hotel_name,
          website: profile.website,
          city: profile.city,
        },
        direct_deal: {
          beats_ota_rate_up_to_pct: rules.quiet_dates_max_discount_pct,
          perks: rules.preferred_perks,
          owner_review_above_rooms: rules.owner_review_above_rooms,
        },
        channels,
        guest_contact: contactSettings.guest_contact_policy,
        group_threshold_rooms: 4,
        human_only: ["accept", "payment", "cancellation_elsewhere"],
      },
      null,
      2,
    );
  }, [contactSettings, profile, rules]);

  const installSnippet = `<script
  src="https://parleywebmcp.vercel.app/kit/v1/kit.js"
  data-property="YOUR_PROPERTY_KEY"
  data-api="https://parleywebmcp.vercel.app"
  defer
></script>`;

  const runTool = async (name: string, args: JsonObject): Promise<ToolResult> => {
    let result: ToolResult;
    try {
      switch (name) {
        case "get_parley_overview":
          result = {
            ok: true,
            human_summary:
              "Parley lets a hotel's website negotiate direct offers while people keep control of enrollment and booking acceptance.",
            next_actions: [
              "estimate_direct_booking_upside",
              "set_hotel_profile",
              "configure_negotiation_rules",
            ],
            live_demo_url: `${window.location.origin}/demo`,
            onboarding: {
              level0: "Publish one JSON file for immediate agent discovery.",
              webmcp: "Add one script after Parley provisions the property key.",
              rules: "Describe your deal policy normally; your agent fills the rule card.",
              enquiries: "Choose an inbox; guests are asked before details are shared.",
              pilot: "An authorized person submits the visible pilot form.",
            },
            human_only:
              "No WebMCP tool enrolls a hotel, publishes code, or agrees to contact. A person must use the visible controls.",
          };
          break;
        case "get_hotel_onboarding_context":
          result = {
            ok: true,
            human_summary: "The shared hotel setup studio is ready.",
            next_actions:
              pilotStatusRef.current === "submitted"
                ? []
                : [
                    "set_hotel_profile",
                    "configure_negotiation_rules",
                    "set_guest_enquiry_inbox",
                    "prepare_pilot_signup",
                  ],
            hotel_profile: profileRef.current,
            negotiation_rules: rulesRef.current,
            contact_settings: contactSettingsRef.current,
            visible_preview: previewRef.current,
            pilot_status: pilotStatusRef.current,
            human_only:
              "Pilot enrollment requires the visible consent checkbox and Request pilot access button.",
          };
          break;
        case "estimate_direct_booking_upside": {
          const annualRevenue = requiredNumber(args, "annual_ota_revenue_eur");
          const commissionPct = requiredNumber(args, "ota_commission_pct");
          const shiftPct = requiredNumber(args, "shift_to_direct_pct");
          const shiftedRevenue = annualRevenue * (shiftPct / 100);
          const avoidedCommission = shiftedRevenue * (commissionPct / 100);
          const parleyFee = shiftedRevenue * 0.03;
          const availablePool = Math.max(0, avoidedCommission - parleyFee);
          result = {
            ok: true,
            human_summary: `Shifting ${shiftPct}% of that OTA revenue direct could recover an indicative ${euro(availablePool)} after a 3% Parley fee.`,
            next_actions: ["set_hotel_profile", "configure_negotiation_rules"],
            assumptions: {
              annual_ota_revenue_eur: annualRevenue,
              ota_commission_pct: commissionPct,
              shift_to_direct_pct: shiftPct,
              parley_fee_pct: 3,
            },
            shifted_revenue_eur: Math.round(shiftedRevenue),
            avoided_ota_commission_eur: Math.round(avoidedCommission),
            parley_fee_eur: Math.round(parleyFee),
            available_for_guest_value_and_hotel_uplift_eur: Math.round(availablePool),
            disclaimer: "Indicative arithmetic only; this is not a revenue guarantee.",
          };
          setMessage(result.human_summary);
          break;
        }
        case "set_hotel_profile": {
          const nextProfile: HotelProfile = {
            hotel_name: requiredString(args, "hotel_name"),
            website: requiredString(args, "website"),
            city: requiredString(args, "city"),
            rooms: requiredNumber(args, "rooms"),
            ota_commission_pct: requiredNumber(args, "ota_commission_pct"),
            contact_email: optionalString(args, "contact_email"),
          };
          setProfile(nextProfile);
          profileRef.current = nextProfile;
          result = {
            ok: true,
            human_summary: `The visible setup now reflects ${nextProfile.hotel_name}.`,
            next_actions: [
              "configure_negotiation_rules",
              "set_guest_enquiry_inbox",
              "show_level0_manifest",
            ],
            hotel_profile: nextProfile,
            stored: false,
          };
          setMessage(result.human_summary);
          break;
        }
        case "configure_negotiation_rules": {
          const nextRules: HotelNegotiationRules = {
            min_hotel_uplift_pct: requiredNumber(args, "min_hotel_uplift_pct"),
            quiet_dates_max_discount_pct: requiredNumber(
              args,
              "quiet_dates_max_discount_pct",
            ),
            preferred_perks: requiredPerks(args),
            owner_review_above_rooms: requiredNumber(
              args,
              "owner_review_above_rooms",
            ),
            prepay_required_over_discount_pct: requiredNumber(
              args,
              "prepay_required_over_discount_pct",
            ),
            voice: requiredString(args, "voice"),
          };
          setRules(nextRules);
          rulesRef.current = nextRules;
          setPolicyBrief(ruleSummary(nextRules));
          document.getElementById("rule-results")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          result = {
            ok: true,
            human_summary: "The hotel's plain-language preferences are now shown as working negotiation rules.",
            next_actions: ["set_guest_enquiry_inbox", "show_level0_manifest"],
            negotiation_rules: nextRules,
            plain_language_summary: ruleSummary(nextRules),
            activated: false,
          };
          setMessage(result.human_summary);
          break;
        }
        case "set_guest_enquiry_inbox": {
          const inbox = requiredString(args, "enquiry_inbox");
          const policy = requiredString(args, "guest_contact_policy");
          if (policy !== "ask_each_time") {
            throw new Error("Guest contact policy must ask for permission each time.");
          }
          const nextSettings: HotelContactSettings = {
            enquiry_inbox: inbox,
            guest_contact_policy: "ask_each_time",
          };
          setContactSettings(nextSettings);
          contactSettingsRef.current = nextSettings;
          document.getElementById("enquiry-inbox")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          result = {
            ok: true,
            human_summary: `Guest follow-up requests will be prepared for ${inbox}, with permission requested every time.`,
            next_actions: ["show_level0_manifest", "prepare_pilot_signup"],
            contact_settings: nextSettings,
            activated: false,
            privacy:
              "This setup never shares guest details without their explicit permission and does not send an email now.",
          };
          setMessage(result.human_summary);
          break;
        }
        case "show_level0_manifest":
          setPreview("level0");
          previewRef.current = "level0";
          document.getElementById("integration-preview")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          result = {
            ok: true,
            human_summary:
              "The copy-ready Level 0 discovery manifest is visible in the setup studio.",
            next_actions: ["show_install_snippet", "prepare_pilot_signup"],
            publish_path: "/.well-known/negotiate.json",
            manifest: JSON.parse(level0Manifest),
            side_effect: "Changed the visible code preview only; nothing was published.",
          };
          break;
        case "show_install_snippet":
          setPreview("script");
          previewRef.current = "script";
          document.getElementById("integration-preview")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          result = {
            ok: true,
            human_summary: "The one-script installation preview is visible for developer handoff.",
            next_actions: ["prepare_pilot_signup"],
            snippet: installSnippet,
            activation_note:
              "Replace YOUR_PROPERTY_KEY only after Parley provisions the hotel's pilot property.",
            side_effect: "Changed the visible code preview only; no website was modified.",
          };
          break;
        case "prepare_pilot_signup": {
          const nextProfile: HotelProfile = {
            hotel_name: requiredString(args, "hotel_name"),
            website: requiredString(args, "website"),
            city: requiredString(args, "city"),
            rooms: requiredNumber(args, "rooms"),
            ota_commission_pct: requiredNumber(args, "ota_commission_pct"),
            contact_email: requiredString(args, "contact_email"),
          };
          setProfile(nextProfile);
          profileRef.current = nextProfile;
          setPilotStatus("prepared");
          pilotStatusRef.current = "prepared";
          setConsent(false);
          document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth", block: "center" });
          result = {
            ok: true,
            human_summary:
              "The pilot form is prepared, but it has not been submitted or stored.",
            next_actions: ["get_pilot_signup_status"],
            prepared: true,
            submitted: false,
            human_only:
              "An authorized person must review the details, check consent, and press Request pilot access.",
          };
          setMessage(result.human_summary);
          break;
        }
        case "get_pilot_signup_status":
          result = {
            ok: true,
            human_summary:
              pilotStatusRef.current === "submitted"
                ? "A person submitted this hotel to the pilot list."
                : pilotStatusRef.current === "prepared"
                  ? "The form is prepared and waiting for human consent and submission."
                  : "No pilot request has been submitted from this page.",
            next_actions:
              pilotStatusRef.current === "idle" ? ["prepare_pilot_signup"] : [],
            status: pilotStatusRef.current,
            human_only:
              "Enrollment is completed only through the visible Request pilot access button.",
          };
          break;
        default:
          result = {
            ok: false,
            error_code: "unknown_tool",
            human_summary: `Unknown Parley onboarding tool: ${name}.`,
          };
      }
    } catch (error) {
      result = errorResult(error instanceof Error ? error.message : "The tool arguments were invalid.");
    }

    setActivity((current) => [
      { tool: name, ok: result.ok, summary: result.human_summary },
      ...current,
    ].slice(0, 8));
    return result;
  };

  useEffect(() => {
    activeRunner = runTool;
  });

  useEffect(() => {
    const modelContext = (
      document as Document & { modelContext?: LandingModelContext }
    ).modelContext;
    if (!modelContext) {
      queueMicrotask(() => setRegistrationStatus("ordinary"));
      return;
    }
    void registerLandingTools(modelContext)
      .then(() => setRegistrationStatus("ready"))
      .catch((error: unknown) => {
        console.error("Parley landing WebMCP registration failed", error);
        registration = undefined;
        setRegistrationStatus("failed");
      });
  }, []);

  const updateProfile = <Key extends keyof HotelProfile>(
    key: Key,
    value: HotelProfile[Key],
  ) => setProfile((current) => ({ ...current, [key]: value }));

  const copyPreview = async (kind: Preview) => {
    await navigator.clipboard.writeText(kind === "level0" ? level0Manifest : installSnippet);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const submitPilot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) return;
    setPilotStatus("submitting");
    setMessage("Sending the pilot request…");
    try {
      const response = await fetch("/api/v1/pilot-signups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...profile,
          negotiation_rules: rules,
          contact_settings: contactSettings,
          consent_to_contact: true,
        }),
      });
      const result = (await response.json()) as ToolResult;
      if (!response.ok || !result.ok) throw new Error(result.human_summary);
      setPilotStatus("submitted");
      pilotStatusRef.current = "submitted";
      setMessage(result.human_summary);
      setActivity((current) => [
        { tool: "Human · request_pilot_access", ok: true, summary: result.human_summary },
        ...current,
      ].slice(0, 8));
    } catch (error) {
      setPilotStatus("error");
      pilotStatusRef.current = "error";
      setMessage(error instanceof Error ? error.message : "The pilot request could not be sent.");
    }
  };

  const statusCopy = {
    checking: "Connecting your setup assistant…",
    ready: "Your setup assistant is ready",
    ordinary: "Use the form, or open in ChatGPT for help",
    failed: "Refresh the page to reconnect your setup assistant",
  }[registrationStatus];

  return (
    <section className={styles.studio} id="onboard" aria-labelledby="studio-title">
      <div className={styles.studioHeading}>
        <div>
          <p className={styles.eyebrow}>Set up in a conversation</p>
          <h2 id="studio-title">Tell your agent how you run the hotel.</h2>
        </div>
        <div className={styles.runtimeBadge} data-status={registrationStatus}>
          <span aria-hidden="true" />
          {statusCopy}
        </div>
      </div>

      <div className={styles.studioGrid}>
        <div className={styles.builderCard}>
          <div className={styles.stepLabel}><span>01</span> A little about your hotel</div>
          <div className={styles.formGrid}>
            <label>
              Hotel name
              <input
                value={profile.hotel_name}
                onChange={(event) => updateProfile("hotel_name", event.target.value)}
              />
            </label>
            <label>
              Website
              <input
                type="url"
                value={profile.website}
                onChange={(event) => updateProfile("website", event.target.value)}
              />
            </label>
            <label>
              City or destination
              <input
                value={profile.city}
                onChange={(event) => updateProfile("city", event.target.value)}
              />
            </label>
            <label>
              Rooms
              <input
                type="number"
                min={1}
                max={2000}
                value={profile.rooms}
                onChange={(event) => updateProfile("rooms", Number(event.target.value))}
              />
            </label>
            <label>
              OTA commission
              <span className={styles.inputSuffix}>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={profile.ota_commission_pct}
                  onChange={(event) =>
                    updateProfile("ota_commission_pct", Number(event.target.value))
                  }
                />
                <span>%</span>
              </span>
            </label>
          </div>

          <div className={styles.stepLabel}><span>02</span> Describe a deal you would be happy with</div>
          <div className={styles.briefCard}>
            <label htmlFor="policy-brief">Say this to your agent, in your own words</label>
            <textarea
              id="policy-brief"
              value={policyBrief}
              onChange={(event) => setPolicyBrief(event.target.value)}
              rows={5}
            />
            <div>
              <span>Your agent turns this into the clear rules below.</span>
              <button
                type="button"
                onClick={() => {
                  setPolicyBrief(DEFAULT_POLICY_BRIEF);
                  setRules(DEFAULT_RULES);
                  rulesRef.current = DEFAULT_RULES;
                }}
              >
                Use this example
              </button>
            </div>
          </div>

          <div className={styles.ruleResults} id="rule-results">
            <div className={styles.resultHeader}>
              <div>
                <strong>Rules Parley will follow</strong>
                <span>These are examples. You or your agent can change them.</span>
              </div>
              <span className={styles.readyPill}>Ready to review</span>
            </div>
            <div className={styles.ruleGrid}>
              <label>
                Protect my earnings
                <span>Beat my OTA net by at least</span>
                <span className={styles.ruleValue}>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={rules.min_hotel_uplift_pct}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        min_hotel_uplift_pct: Number(event.target.value),
                      }))
                    }
                  />%
                </span>
              </label>
              <label>
                On quiet dates
                <span>Discount by no more than</span>
                <span className={styles.ruleValue}>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={rules.quiet_dates_max_discount_pct}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        quiet_dates_max_discount_pct: Number(event.target.value),
                      }))
                    }
                  />%
                </span>
              </label>
              <label>
                Sweeten the deal first
                <span>{rules.preferred_perks.map(friendlyPerk).join(" + ")}</span>
                <strong>before cutting price</strong>
              </label>
              <label>
                Bring bigger groups to me
                <span>Ask for my approval above</span>
                <span className={styles.ruleValue}>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rules.owner_review_above_rooms}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        owner_review_above_rooms: Number(event.target.value),
                      }))
                    }
                  /> rooms
                </span>
              </label>
              <label>
                Deepest discounts
                <span>Require prepayment when discount is more than</span>
                <span className={styles.ruleValue}>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={rules.prepay_required_over_discount_pct}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        prepay_required_over_discount_pct: Number(event.target.value),
                      }))
                    }
                  />% off
                </span>
              </label>
              <label>
                Sound like us
                <span>Offer style</span>
                <input
                  className={styles.voiceInput}
                  value={rules.voice}
                  onChange={(event) =>
                    setRules((current) => ({ ...current, voice: event.target.value }))
                  }
                />
              </label>
            </div>
            <p className={styles.ruleSummary}>{ruleSummary(rules)}</p>
          </div>

          <div className={styles.stepLabel}><span>03</span> Choose where guest enquiries arrive</div>
          <div className={styles.inboxCard} id="enquiry-inbox">
            <div className={styles.inboxIcon} aria-hidden="true">@</div>
            <div className={styles.inboxFields}>
              <label>
                Reservations inbox
                <input
                  type="email"
                  placeholder="reservations@yourhotel.com"
                  required={contactSettings.guest_contact_policy === "ask_each_time"}
                  value={contactSettings.enquiry_inbox ?? ""}
                  onChange={(event) =>
                    setContactSettings({
                      enquiry_inbox: event.target.value || undefined,
                      guest_contact_policy: event.target.value
                        ? "ask_each_time"
                        : "do_not_collect",
                    })
                  }
                />
              </label>
              <label className={styles.inboxToggle}>
                <input
                  type="checkbox"
                  checked={contactSettings.guest_contact_policy === "ask_each_time"}
                  onChange={(event) =>
                    setContactSettings((current) => ({
                      ...current,
                      guest_contact_policy: event.target.checked
                        ? "ask_each_time"
                        : "do_not_collect",
                    }))
                  }
                />
                Receive enquiries from guests who say yes
              </label>
              <p>
                Before anything is shared, the guest&apos;s agent must ask: “Would you like
                the hotel to contact you?” No clear yes, no contact details. This address is
                saved with your pilot setup; messages begin only after activation.
              </p>
            </div>
          </div>

          <div className={styles.stepLabel}><span>04</span> Give this to your website partner</div>
          <div className={styles.previewTabs} id="integration-preview">
            <button
              type="button"
              aria-pressed={preview === "level0"}
              onClick={() => setPreview("level0")}
            >
              Simple starter file
            </button>
            <button
              type="button"
              aria-pressed={preview === "script"}
              onClick={() => setPreview("script")}
            >
              Live-offer script
            </button>
          </div>
          <div className={styles.codeCard}>
            <div className={styles.codeMeta}>
              <span>{preview === "level0" ? "/.well-known/negotiate.json" : "Website footer"}</span>
              <button type="button" onClick={() => void copyPreview(preview)}>
                {copied === preview ? "Copied" : "Copy"}
              </button>
            </div>
            <pre tabIndex={0}>
              <code>{preview === "level0" ? level0Manifest : installSnippet}</code>
            </pre>
          </div>
          <p className={styles.helperCopy}>
            Copy either option or send it to the person who manages your website. We provide
            the property key during the pilot. You do not need to replace your booking engine.
          </p>
        </div>

        <aside className={styles.agentCard} aria-label="Agent onboarding activity">
          <div className={styles.agentCardHeader}>
            <div>
              <span className={styles.agentDot} aria-hidden="true" />
              Your setup assistant
            </div>
            <small>{activity.length} calls</small>
          </div>
          <p>
            Talk normally. Your agent can fill the hotel details, turn your deal policy into
            rules, set the reservations inbox, and prepare the website handoff.
          </p>
          <div className={styles.promptCard}>
            “We have 32 rooms and pay 18% commission. On quiet nights, offer breakfast before
            discounting. Send consented enquiries to reservations@ourhotel.com.”
          </div>
          <div className={styles.toolList} aria-live="polite">
            {activity.length === 0 ? (
              LANDING_TOOL_DEFINITIONS.slice(0, 7).map((tool) => (
                <div key={tool.name}><span />{tool.name}</div>
              ))
            ) : (
              activity.map((item, index) => (
                <div key={`${item.tool}-${index}`} title={item.summary}>
                  <span data-ok={item.ok} />{item.tool}
                </div>
              ))
            )}
          </div>
          <div className={styles.agentBoundary}>
            <strong>You stay in control</strong>
            <span>Your agent can prepare the setup, but cannot activate it or share guest details without permission.</span>
          </div>
        </aside>
      </div>

      <form className={styles.pilotCard} id="pilot" onSubmit={(event) => void submitPilot(event)}>
        <div>
          <div className={styles.stepLabel}><span>05</span> Review once and join the pilot</div>
          <h3>Happy with the setup? We&apos;ll switch it on with you.</h3>
          <p>
            Start with one property. We connect your current booking flow, test the rules
            together, and make sure enquiries reach the right team.
          </p>
        </div>
        <div className={styles.pilotFields}>
          <label>
            Work email
            <input
              required
              type="email"
              placeholder="you@hotel.com"
              value={profile.contact_email}
              onChange={(event) => updateProfile("contact_email", event.target.value)}
            />
          </label>
          <label className={styles.consent}>
            <input
              required
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>I&apos;m authorized to request access and agree Parley may contact me about this pilot.</span>
          </label>
          <button
            className={styles.primaryButton}
            disabled={!consent || pilotStatus === "submitting" || pilotStatus === "submitted"}
            type="submit"
          >
            {pilotStatus === "submitting"
              ? "Requesting…"
              : pilotStatus === "submitted"
                ? "Pilot requested"
                : "Request pilot access"}
          </button>
          <p className={styles.formStatus} aria-live="polite">{message}</p>
        </div>
      </form>
    </section>
  );
}
