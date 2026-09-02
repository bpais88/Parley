import { TOOL_DEFINITIONS, type ToolDefinition } from "./tool-definitions";

type JsonObject = Record<string, unknown>;
type ToolResult = JsonObject & { ok: boolean; human_summary: string };
type Actor = "Your agent" | "You";
type TimelineEntry = { actor: string; text: string; kind: "action" | "offer" | "system" };
type Activity = { tool: string; ok: boolean; latency: number };
type RegisteredTool = ToolDefinition & {
  execute: (args: JsonObject) => Promise<ToolResult>;
};

declare global {
  interface Window {
    __parleyTools?: {
      list: () => ToolDefinition[];
      call: (name: string, args?: JsonObject) => Promise<ToolResult>;
    };
  }
}

const asObject = (value: unknown): JsonObject | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const stringValue = (object: JsonObject, key: string): string => {
  const value = object[key];
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
};

const numberValue = (object: JsonObject, key: string): number => {
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a number`);
  }
  return value;
};

const currentScript =
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : document.querySelector<HTMLScriptElement>('script[src*="/kit/"]');
const propertySlug = currentScript?.dataset.property ?? "casa-do-zezere";
const apiBase = (currentScript?.dataset.api ?? window.location.origin).replace(/\/$/, "");

const state: {
  open: boolean;
  loading: boolean;
  error: string | null;
  bootstrap: JsonObject | null;
  stay: { check_in: string; check_out: string; rooms: number; guests_per_room: number };
  availability: JsonObject | null;
  hold: JsonObject | null;
  sessionId: string | null;
  offer: JsonObject | null;
  booking: JsonObject | null;
  checkout: { token: string } | null;
  timeline: TimelineEntry[];
  activity: Activity[];
} = {
  open: true,
  loading: true,
  error: null,
  bootstrap: null,
  stay: { check_in: "2026-09-24", check_out: "2026-09-27", rooms: 5, guests_per_room: 1 },
  availability: null,
  hold: null,
  sessionId: null,
  offer: null,
  booking: null,
  checkout: null,
  timeline: [
    {
      actor: "Casa do Zêzere",
      text: "Tell us the stay you need. Our policy engine can negotiate a direct rate.",
      kind: "system",
    },
  ],
  activity: [],
};

const host = document.createElement("div");
host.id = "parley-kit";
const shadow = host.attachShadow({ mode: "open" });
document.body.append(host);

const money = (cents: unknown) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100)
    : "—";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function api(path: string, init?: RequestInit): Promise<ToolResult> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const result = asObject(await response.json().catch(() => null));
  if (!result) {
    return { ok: false, error_code: "invalid_response", human_summary: "Parley returned an unreadable response." };
  }
  if (typeof result.ok !== "boolean" || typeof result.human_summary !== "string") {
    return { ok: false, error_code: "invalid_response", human_summary: "Parley returned an incomplete response." };
  }
  return result as ToolResult;
}

const stayFromArgs = (args: JsonObject) => ({
  check_in: stringValue(args, "check_in"),
  check_out: stringValue(args, "check_out"),
  rooms: numberValue(args, "rooms"),
  guests_per_room: numberValue(args, "guests_per_room"),
});

function addTimeline(actor: string, text: string, kind: TimelineEntry["kind"] = "action") {
  state.timeline.push({ actor, text, kind });
}

function offerFromResult(result: JsonObject): JsonObject | null {
  const direct = asObject(result.offer);
  if (direct) return direct;
  const negotiation = asObject(result.result);
  return negotiation?.kind === "offer" ? negotiation : null;
}

async function runTool(name: string, args: JsonObject, actor: Actor): Promise<ToolResult> {
  const started = performance.now();
  let result: ToolResult;
  try {
    switch (name) {
      case "get_stay_context":
        result = {
          ok: true,
          human_summary: state.sessionId
            ? "The shared panel has an active negotiated offer."
            : "The shared panel is ready for a stay search.",
          next_actions: state.sessionId ? ["get_offer_status"] : ["set_dates", "search_availability"],
          property: state.bootstrap?.property ?? { slug: propertySlug },
          stay: state.stay,
          active_hold: state.hold,
          active_session_id: state.sessionId,
          current_offer: state.offer,
          human_only:
            "The guest must use Accept & pay in the visible panel; there is no WebMCP tool for acceptance, payment, card details, or cancelling another booking.",
        };
        break;
      case "set_dates": {
        state.stay = stayFromArgs(args);
        state.availability = null;
        state.hold = null;
        state.sessionId = null;
        state.offer = null;
        addTimeline(
          actor,
          `Set ${state.stay.rooms} room${state.stay.rooms === 1 ? "" : "s"}, ${state.stay.check_in} → ${state.stay.check_out}.`,
        );
        result = {
          ok: true,
          human_summary: "The stay picker now shows the requested dates, rooms, and guests.",
          next_actions: ["search_availability"],
          stay: state.stay,
        };
        break;
      }
      case "search_availability": {
        const stay = stayFromArgs(args);
        const query = new URLSearchParams({
          check_in: stay.check_in,
          check_out: stay.check_out,
          rooms: String(stay.rooms),
          guests_per_room: String(stay.guests_per_room),
        });
        result = await api(`/api/v1/availability?${query}`);
        if (result.ok) {
          state.stay = stay;
          state.availability = result;
        }
        break;
      }
      case "hold_rooms": {
        const stay = stayFromArgs(args);
        result = await api("/api/v1/holds", { method: "POST", body: JSON.stringify(stay) });
        if (result.ok) {
          state.stay = stay;
          state.hold = result;
          addTimeline(actor, `Held ${stay.rooms} Standard rooms for 15 minutes.`);
        }
        break;
      }
      case "request_offer": {
        const payload: JsonObject = {
          hold_id: stringValue(args, "hold_id"),
          asks: args.asks,
          payment_preference: args.payment_preference,
        };
        if (args.notes !== undefined) payload.notes = args.notes;
        if (args.existing_booking !== undefined) payload.existing_booking = args.existing_booking;
        result = await api("/api/v1/sessions", { method: "POST", body: JSON.stringify(payload) });
        if (result.ok) {
          state.sessionId = typeof result.session_id === "string" ? result.session_id : null;
          const offer = offerFromResult(result);
          if (offer) {
            state.offer = offer;
            addTimeline(actor, "Requested breakfast and late checkout from the hotel policy.", "action");
            addTimeline("Casa do Zêzere · policy", String(offer.explanation ?? result.human_summary), "offer");
          } else {
            addTimeline("Casa do Zêzere · owner", result.human_summary, "system");
          }
        }
        break;
      }
      case "counter_offer": {
        const sessionId = stringValue(args, "session_id");
        const payload = { ...args };
        delete payload.session_id;
        result = await api(`/api/v1/sessions/${encodeURIComponent(sessionId)}/counter`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result.ok) {
          const offer = offerFromResult(result);
          if (offer) state.offer = offer;
          const target = args.target_total_cents ?? args.target_per_night_cents;
          addTimeline(actor, `Countered at ${money(target)}${args.target_per_night_cents ? " per room-night" : " total"}.`);
          addTimeline("Casa do Zêzere · policy", String(offer?.explanation ?? result.human_summary), "offer");
        }
        break;
      }
      case "get_offer_status":
        result = await api(`/api/v1/sessions/${encodeURIComponent(stringValue(args, "session_id"))}`);
        if (result.ok) {
          const offer = offerFromResult(result);
          if (offer) state.offer = offer;
        }
        break;
      case "get_booking":
        result = await api(`/api/v1/bookings/${encodeURIComponent(stringValue(args, "booking_ref"))}`);
        if (result.ok) state.booking = result;
        break;
      default:
        result = { ok: false, error_code: "unknown_tool", human_summary: `Unknown Parley tool: ${name}.` };
    }
  } catch (error) {
    result = {
      ok: false,
      error_code: "invalid_arguments",
      human_summary: error instanceof Error ? error.message : "The tool arguments were invalid.",
    };
  }

  const latency = Math.round(performance.now() - started);
  state.activity.push({ tool: name, ok: result.ok, latency });
  if (state.activity.length > 30) state.activity.shift();
  void api("/api/v1/tool-calls", {
    method: "POST",
    body: JSON.stringify({
      tool: name,
      args,
      ...(state.sessionId ? { session_id: state.sessionId } : {}),
      result_summary: result.human_summary,
      ok: result.ok,
      latency_ms: latency,
    }),
  }).catch(() => undefined);
  render();
  return result;
}

function remaining(instant: unknown) {
  if (typeof instant !== "string") return "";
  const seconds = Math.max(0, Math.floor((Date.parse(instant) - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function currentOfferHtml() {
  const offer = state.offer;
  if (!offer) return "";
  const inclusions = Array.isArray(offer.inclusions) ? offer.inclusions : [];
  return `<section class="offer-card">
    <div class="overline">Round ${escapeHtml(offer.round)}${offer.final ? " · Final" : ""}</div>
    <div class="offer-price"><strong>${money(offer.all_in_total_cents)}</strong><span>all-in</span></div>
    <p>${money(offer.price_per_night_cents)} per room-night · ${escapeHtml(offer.rate_plan === "nrf" ? "Non-refundable" : "Flexible")}</p>
    <div class="chips">${inclusions.map((item) => `<span>${escapeHtml(String(item).replaceAll("_", " "))}</span>`).join("")}</div>
    <p class="explain">${escapeHtml(offer.explanation)}</p>
    <div class="expiry">Offer expires in <b data-countdown="${escapeHtml(offer.expires_at)}">${remaining(offer.expires_at)}</b></div>
    <button class="primary" data-action="checkout">Accept &amp; pay ${money(offer.all_in_total_cents)}</button>
    <small>Human-only demo checkout · no charge</small>
  </section>`;
}

function timelineHtml() {
  return state.timeline
    .slice(-7)
    .map(
      (entry) => `<li class="timeline ${entry.kind}"><span>${escapeHtml(entry.actor)}</span><p>${escapeHtml(entry.text)}</p></li>`,
    )
    .join("");
}

function activitiesHtml() {
  if (!state.activity.length) return `<p class="muted">Tool calls will appear here.</p>`;
  return state.activity
    .slice(-8)
    .reverse()
    .map(
      (item) => `<div class="activity"><i class="${item.ok ? "ok" : "bad"}"></i><code>${escapeHtml(item.tool)}</code><span>${item.latency}ms</span></div>`,
    )
    .join("");
}

function checkoutHtml() {
  if (!state.checkout) return "";
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <form id="parley-checkout"><button type="button" class="close" data-action="close-checkout" aria-label="Close checkout">×</button>
      <div class="overline">Human checkpoint</div><h2 id="checkout-title">Confirm the demo booking</h2>
      <p>Review the offer, then identify the guest. No card fields exist and no payment is processed.</p>
      <label>Name<input name="guest_name" required value="Alex Morgan" maxlength="120"></label>
      <label>Email<input name="guest_email" required type="email" value="alex@example.com" maxlength="254"></label>
      <div class="demo-note">DEMO — no charge · no card details collected</div>
      <button class="primary" type="submit">Confirm booking</button>
    </form>
  </div>`;
}

function bookingHtml() {
  const booking = state.booking;
  if (!booking) return "";
  return `<section class="confirmation"><div class="check">✓</div><div class="overline">Direct booking confirmed</div>
    <h2>${escapeHtml(booking.booking_ref)}</h2><strong>${money(booking.all_in_total_cents)} all-in</strong>
    <p>${escapeHtml(booking.rooms)} Standard rooms · ${escapeHtml(booking.check_in)} → ${escapeHtml(booking.check_out)}</p>
    <p>No payment was processed. The guest keeps this reference as the demo confirmation.</p></section>`;
}

function render() {
  const roomTypes = Array.isArray(state.availability?.room_types) ? state.availability.room_types : [];
  const room = asObject(roomTypes[0]);
  const holdExpiry = state.hold?.expires_at;
  shadow.innerHTML = `<style>${styles}</style>
    <button class="launcher ${state.open ? "hidden" : ""}" data-action="toggle" aria-label="Open Parley deal panel"><b>P</b><span>Negotiate direct</span></button>
    <aside class="panel ${state.open ? "" : "closed"}" aria-label="Parley direct deal panel">
      <header><div><div class="brand">PARLEY</div><h1>Casa do Zêzere</h1><span class="badge">Negotiable direct rates</span></div><button class="icon" data-action="toggle" aria-label="Close panel">×</button></header>
      <main>
        ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ""}
        ${state.loading ? `<div class="loading">Connecting to the hotel policy…</div>` : ""}
        ${bookingHtml() || `<div>
          <section class="stay"><div class="section-title"><b>Your stay</b><small>Shared with your agent</small></div>
            <div class="dates"><label>Check in<input id="check-in" type="date" value="${state.stay.check_in}"></label><label>Check out<input id="check-out" type="date" value="${state.stay.check_out}"></label></div>
            <div class="numbers"><label>Rooms<input id="rooms" type="number" min="1" max="12" value="${state.stay.rooms}"></label><label>Guests / room<input id="guests" type="number" min="1" max="4" value="${state.stay.guests_per_room}"></label></div>
            <button class="secondary" data-action="search">Check direct availability</button>
          </section>
          ${room ? `<section class="room"><div><div class="overline">Standard</div><h2>${money(room.bar_flex_cents)} <small>/ room-night</small></h2><p>${escapeHtml(room.available)} rooms available · Flexible direct rate</p></div>${state.hold ? "" : `<button data-action="hold">Hold ${state.stay.rooms}</button>`}</section>` : ""}
          ${state.hold ? `<div class="hold"><span>● ${state.stay.rooms} × Standard held</span><b data-countdown="${escapeHtml(holdExpiry)}">${remaining(holdExpiry)}</b></div>` : ""}
          ${state.hold && !state.sessionId ? `<button class="primary" data-action="offer">Request breakfast + late checkout</button>` : ""}
          ${currentOfferHtml()}
          ${state.offer && Number(state.offer.round) === 1 ? `<button class="counter" data-action="counter">Counter €1,400 prepaid</button>` : ""}
          <section><div class="section-title"><b>Deal timeline</b><small>Two identities, one page</small></div><ol class="timeline-list">${timelineHtml()}</ol></section>
        </div>`}
        <details class="activity-wrap" open><summary>WebMCP activity <span>${state.activity.length}</span></summary>${activitiesHtml()}</details>
      </main>
      ${checkoutHtml()}
    </aside>`;
}

async function openCheckout() {
  if (!state.sessionId) return;
  const result = await api("/api/v1/checkout/token", {
    method: "POST",
    body: JSON.stringify({ session_id: state.sessionId }),
  });
  if (result.ok && typeof result.checkout_token === "string") {
    state.checkout = { token: result.checkout_token };
  } else {
    state.error = result.human_summary;
  }
  render();
}

shadow.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-action]") : null;
  if (!target) return;
  const action = target.dataset.action;
  if (action === "toggle") {
    state.open = !state.open;
    render();
  } else if (action === "close-checkout") {
    state.checkout = null;
    render();
  } else if (action === "search") {
    void runTool("search_availability", state.stay, "You");
  } else if (action === "hold") {
    void runTool("hold_rooms", state.stay, "You");
  } else if (action === "offer" && state.hold && typeof state.hold.hold_id === "string") {
    void runTool(
      "request_offer",
      { hold_id: state.hold.hold_id, asks: ["breakfast", "late_checkout"], payment_preference: "flexible" },
      "You",
    );
  } else if (action === "counter" && state.sessionId) {
    void runTool(
      "counter_offer",
      { session_id: state.sessionId, target_total_cents: 140_000, keep_inclusions: true, payment_preference: "prepaid_ok" },
      "You",
    );
  } else if (action === "checkout") {
    void openCheckout();
  }
});

shadow.addEventListener("change", (event) => {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input) return;
  if (input.id === "check-in") state.stay.check_in = input.value;
  if (input.id === "check-out") state.stay.check_out = input.value;
  if (input.id === "rooms") state.stay.rooms = Number(input.value);
  if (input.id === "guests") state.stay.guests_per_room = Number(input.value);
});

shadow.addEventListener("submit", (event) => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "parley-checkout") return;
  event.preventDefault();
  if (!state.checkout || !state.sessionId) return;
  const data = new FormData(event.target);
  void api(`/api/v1/sessions/${encodeURIComponent(state.sessionId)}/accept`, {
    method: "POST",
    body: JSON.stringify({
      checkout_token: state.checkout.token,
      guest_name: String(data.get("guest_name") ?? ""),
      guest_email: String(data.get("guest_email") ?? ""),
    }),
  }).then((result) => {
    state.checkout = null;
    if (result.ok) {
      state.booking = result;
      addTimeline("You", "Confirmed the direct booking in the visible checkout.", "action");
    } else {
      state.error = result.human_summary;
    }
    render();
  });
});

const registeredTools: RegisteredTool[] = TOOL_DEFINITIONS.map((definition) => ({
  ...definition,
  execute: (args: JsonObject = {}) => runTool(definition.name, args, "Your agent"),
}));

const modelContext = asObject((document as Document & { modelContext?: unknown }).modelContext);
if (modelContext && typeof modelContext.registerTool === "function") {
  for (const tool of registeredTools) {
    (modelContext.registerTool as (tool: RegisteredTool) => void)(tool);
  }
} else if (
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  new URLSearchParams(window.location.search).get("debug") === "1"
) {
  window.__parleyTools = {
    list: () => TOOL_DEFINITIONS,
    call: async (name, args = {}) => {
      const tool = registeredTools.find((candidate) => candidate.name === name);
      return tool
        ? tool.execute(args)
        : { ok: false, error_code: "unknown_tool", human_summary: `Unknown Parley tool: ${name}.` };
    },
  };
}

void api(`/api/v1/properties/${encodeURIComponent(propertySlug)}/bootstrap`).then((result) => {
  state.loading = false;
  if (result.ok) state.bootstrap = result;
  else state.error = result.human_summary;
  render();
});

setInterval(() => {
  for (const element of shadow.querySelectorAll<HTMLElement>("[data-countdown]")) {
    element.textContent = remaining(element.dataset.countdown);
  }
}, 1_000);

const styles = `
  :host{all:initial}*{box-sizing:border-box}button,input{font:inherit}.hidden,.closed{display:none!important}
  .launcher{position:fixed;z-index:2147483000;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;border:0;border-radius:99px;padding:9px 15px 9px 9px;background:#f2c77f;color:#2b2014;box-shadow:0 16px 45px #0005;font:700 14px Inter,system-ui;cursor:pointer}.launcher b{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#2b2014;color:#f2c77f}
  .panel{position:fixed;z-index:2147483000;right:20px;bottom:20px;width:min(420px,calc(100vw - 24px));height:min(680px,calc(100vh - 24px));overflow:hidden;border:1px solid #ffffff24;border-radius:24px;background:#fbf8f0;color:#2d302a;box-shadow:0 28px 90px #0007;font:14px/1.4 Inter,ui-sans-serif,system-ui;letter-spacing:-.01em}.panel header{display:flex;justify-content:space-between;padding:20px 20px 16px;background:#173e35;color:#fff}.brand{font-size:10px;font-weight:900;letter-spacing:.24em;color:#f2c77f}.panel h1{font:650 22px/1.1 Georgia,serif;margin:4px 0 8px}.badge{display:inline-block;border:1px solid #ffffff3b;border-radius:99px;padding:4px 8px;font-size:11px;color:#e3f3ec}.icon,.close{border:0;background:transparent;color:inherit;font-size:28px;cursor:pointer}.panel main{height:calc(100% - 105px);overflow:auto;padding:18px}.panel section{margin-bottom:18px}.section-title{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px}.section-title b{font-size:13px}.section-title small,.muted{color:#7d8077;font-size:11px}.dates,.numbers{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}label{display:grid;gap:4px;color:#6b6f65;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}input{width:100%;border:1px solid #d8d6cd;border-radius:9px;background:#fff;padding:9px;color:#282b26;text-transform:none;letter-spacing:0}.secondary,.primary,.counter,.room button{width:100%;border-radius:10px;padding:11px 13px;font-weight:750;cursor:pointer}.secondary,.counter{border:1px solid #b8b9af;background:#fff;color:#2d302a}.primary{border:0;background:#c98742;color:#fff;box-shadow:inset 0 -2px #0002}.room{display:flex;justify-content:space-between;align-items:center;border:1px solid #dedbd1;border-radius:15px;padding:14px;background:#fff}.room h2{margin:2px 0;font-size:22px}.room h2 small{font-size:11px;font-weight:500;color:#74776e}.room p{margin:3px 0 0;color:#71756c;font-size:11px}.room button{width:auto;border:0;background:#173e35;color:#fff}.overline{color:#8b6843;font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.hold{display:flex;justify-content:space-between;margin:-8px 0 14px;border-radius:9px;background:#e0efe8;color:#225043;padding:9px 11px;font-size:12px}.offer-card{border-radius:18px!important;padding:16px;background:#173e35;color:#fff;box-shadow:0 12px 30px #173e3522}.offer-price{display:flex;gap:8px;align-items:baseline;margin:4px 0}.offer-price strong{font:650 32px Georgia,serif}.offer-price span,.offer-card p,.offer-card small{color:#c8dbd4}.offer-card p{margin:4px 0;font-size:12px}.offer-card .explain{margin:11px 0}.chips{display:flex;gap:5px;margin:9px 0}.chips span{border-radius:99px;background:#ffffff16;padding:4px 7px;font-size:10px;text-transform:capitalize}.expiry{margin:11px 0;font-size:11px}.offer-card .primary{margin-bottom:5px;background:#f2c77f;color:#322819}.counter{margin:-9px 0 18px}.timeline-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}.timeline{position:relative;border-left:2px solid #cfd2ca;padding-left:12px}.timeline:before{content:"";position:absolute;left:-5px;top:4px;width:8px;height:8px;border-radius:50%;background:#829a8e}.timeline.offer:before{background:#c98742}.timeline span{font-size:10px;font-weight:800;color:#53675e}.timeline p{margin:2px 0;color:#666a62;font-size:12px}.activity-wrap{border-top:1px solid #ddd9ce;padding-top:12px}.activity-wrap summary{cursor:pointer;font-size:11px;font-weight:800;color:#62665e}.activity-wrap summary span{float:right;border-radius:99px;background:#ebe6da;padding:1px 6px}.activity{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:6px;margin-top:7px;font-size:10px}.activity i{width:7px;height:7px;border-radius:50%}.activity i.ok{background:#46a77d}.activity i.bad{background:#c9554f}.activity code{overflow:hidden;text-overflow:ellipsis;color:#42524a}.activity span{color:#8b8d86}.error,.loading{margin-bottom:12px;border-radius:10px;padding:10px;background:#f3e5d5;color:#744a29;font-size:12px}.modal{position:absolute;inset:0;display:grid;place-items:end center;background:#0c1d18aa;backdrop-filter:blur(4px)}.modal form{position:relative;width:100%;border-radius:22px 22px 0 0;background:#fbf8f0;padding:24px}.modal h2{margin:4px 0;font:650 25px Georgia,serif}.modal p{color:#6d7069}.modal label{margin:12px 0}.modal .close{position:absolute;right:16px;top:12px}.demo-note{margin:14px 0;border-radius:8px;background:#ece7db;padding:9px;color:#625a4d;font-size:11px;font-weight:750}.confirmation{text-align:center;padding:20px 10px}.confirmation .check{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 12px;border-radius:50%;background:#dff1e8;color:#267252;font-size:26px}.confirmation h2{font:650 28px Georgia,serif;margin:5px}.confirmation p{color:#70736b}
  @media(max-width:520px){.panel{inset:8px;width:auto;height:auto}.launcher{right:12px;bottom:12px}}
`;

render();
