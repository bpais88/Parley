# Parley — Negotiable direct booking for the agentic web

**Hackathon PRD v1.1 — approved reduced scope, 2 Sep 2026.**

**Deadline:** 3 Sep 2026, 13:00 PDT / 22:00 CEST / 21:00 BST.  
**Internal freeze:** 20:30 CEST / 19:30 BST.

## 0. Purpose and build gate

Parley demonstrates direct hotel negotiation through WebMCP. A guest's agent works against a deterministic hotel policy engine on the same visible booking page. The human keeps the consequential acceptance action.

Before product work:

1. Read `https://learn.chatgpt.com/docs/webmcp`.
2. Build and deploy `/g0`, registering one `ping` tool from top-level JavaScript.
3. The human verifies it in the ChatGPT desktop browser with Sol or Terra and in Chrome with WebMCP testing enabled.
4. Record the observed signature, result shape, confirmation behavior, and Chrome result in `docs/WEBMCP-NOTES.md` and `TESTLOG.md`.

Gate 0 must be green before any negotiation engine, database, or full kit work begins.

## 1. Product thesis

WebMCP lets a hotel website expose structured actions to the guest's agent while both the person and agent share the current page state. Parley uses that capability to make a transparent direct offer within the commission the hotel would otherwise pay an intermediary.

The claim is deliberately narrow:

- The guest's agent can inspect and change the booking state through page-provided tools.
- The hotel side is a deterministic policy engine, not an autonomous agent.
- The human sees every offer in the normal UI and acceptance is excluded from the WebMCP tool surface.
- The ordinary UI remains usable without WebMCP.

Avoid unsupported claims of being the first implementation, absolute claims about server-side MCP, or unreviewed legal claims.

## 2. Approved submission core

Must ship:

- One Vercel deployment containing the demo hotel, API, read-only owner ledger, docs, and kit asset.
- Neon Postgres only if setup is quick; otherwise record and use the approved persistence fallback.
- One Standard room type for the core demo.
- A vanilla TypeScript Shadow-DOM kit loaded by one script tag.
- Eight WebMCP tools and a visible tool-activity timeline.
- A deterministic negotiation engine and exact money tests.
- A five-room offsite negotiation as the primary demo.
- A visible human-only demo checkout action; no payment/card tool and no card-data transmission or storage.
- A simple demo reset.
- A static `/.well-known/negotiate.json` document without a remote URL validator.
- A public repository, detected MIT license, concise README, working live URL, public narrated demo under three minutes, and completed Devpost entry.

Only after the primary flow is green:

- Rebook-direct using `existing_booking`.

Explicitly cut:

- Cloudflare kit deployment and Netlify hotel deployment.
- OpenAI policy parsing and all nonessential LLM calls.
- Email/Resend fallback.
- Editable owner setup and escalation-management UI.
- Remote Level 0 validator.
- Three-hour production soak as a release gate.
- A 100% branch-coverage target.
- Multiple room types, multi-property, multi-currency, i18n, real PMS integration, and real payments.

## 3. Primary user flow

Prompt:

> Team offsite, five single rooms, Thu 24 to Sun 27 September, budget €1,600 all-in. We want breakfast and late checkout Sunday. Don't book; get me the best deal.

Expected interaction:

1. Agent reads stay context and sets the visible dates.
2. Agent searches Standard-room availability.
3. Agent holds five rooms.
4. Agent requests an offer with breakfast and late checkout.
5. The hotel policy engine returns offer 1: €110 per room-night, €1,650 room total, breakfast and late checkout.
6. Agent counters at €1,400 and allows prepayment.
7. Engine returns offer 2: €102 per room-night, €1,530 room total, NRF/prepaid, breakfast and late checkout.
8. City tax is shown separately: €30. The all-in amount is €1,560, within the revised €1,600 budget.
9. Agent reports the trade-off and tells the human to use the visible Accept button if desired.
10. Only the human-facing UI opens the demo checkout and confirms the booking.

The timeline labels calls as `Your agent` and offers as `Casa do Zêzere` or `Hotel policy engine`. Do not describe the latter as a second autonomous agent.

## 4. Reduced architecture

```text
apps/platform
  Next.js App Router application
  /demo               hotel page and kit host
  /owner              read-only policy/ledger proof
  /g0                 Gate 0 runtime proof
  /docs               concise architecture and testing notes
  /api/v1/...         booking demo API
packages/shared       strict schemas
packages/engine       deterministic negotiation math
packages/kit          vanilla TypeScript IIFE and Shadow-DOM panel
docs                   WEBMCP-NOTES.md and Level 0 note
```

One Vercel deployment is the release unit. Cross-host distribution is documented as a future integration path, not built for the submission.

## 5. Eight WebMCP tools

Every tool uses a strict JSON Schema with `additionalProperties: false`. Read tools use `readOnlyHint: true`. Write tools state their visible or server-side effect. Results use the shared result envelope and stay compact.

1. `get_stay_context` — return hotel policy summary, dates, rooms, guests, viewed room, current hold/session/offer, and the statement that acceptance is a UI action and not a tool.
2. `set_dates` — set the visible check-in, check-out, room, and guest controls.
3. `search_availability` — return Standard availability, flex/NRF pricing, breakfast, tax, and stay totals.
4. `hold_rooms` — create a temporary inventory hold and return its expiry.
5. `request_offer` — start deterministic negotiation for a hold and optional existing booking.
6. `counter_offer` — submit one target and payment preference and return the next or standing offer.
7. `get_offer_status` — return current offer, expiry, hold state, round/final state, and the statement that acceptance is a UI action and not a tool.
8. `get_booking` — return a visitor-bound, non-PII confirmation summary after human acceptance.

There is no accept, pay, cancel, card, special-request, highlight-room, compare-rate-plans, or separate-policy tool.

## 6. Core policy and money model

Seed property: Casa do Zêzere, Ferreira do Zêzere, Portugal. Currency EUR; timezone `Europe/Lisbon`.

Core Standard room:

- 12 rooms.
- Flexible BAR: €110 per room-night.
- NRF reference discount: 10%.
- Breakfast price/value: €12 per guest per night; hotel cost €6 per guest per night.
- Late checkout value: €15 per room per stay; hotel cost €0.
- City tax: €2 per guest per night, displayed separately and never negotiated.
- OTA commission: 20%; minimum hotel uplift: 5%; platform fee: 3%.
- Group threshold and escalation-above value: 8 rooms. Nine or more rooms require owner handling; the core UI may return a clear unavailable/escalation result without an owner workflow.
- Maximum rounds: 3; offer TTL: 10 minutes; hold TTL: 15 minutes.

Store all money as integer cents. Use injected `now` values in engine functions.

Per room-night:

```text
ota_net       = BAR * (1 - commission)
floor_net     = ota_net * (1 + min_uplift)
price_min(ic) = ceil_to_whole_euro((floor_net + ic) / (1 - fee))
cash_floor    = BAR * (1 - band.max_cash_discount)
flex_floor    = BAR * 0.95
allowed       = max(price_min(ic), cash_floor, flexible ? flex_floor : 0)
```

Perk cost/value quantities must use their declared unit:

- Breakfast: guests × nights.
- Late checkout: rooms × stay, not rooms × nights.

## 7. Worked example

Five Standard rooms, three nights, single occupancy, 42% average occupancy, breakfast and late checkout:

- Offer 1: €110 flexible × 15 room-nights = €1,650.
- Counter: €1,400 total, prepaid allowed.
- Offer 2: €102 NRF/prepaid × 15 = €1,530.
- City tax: €2 × 5 guests × 3 nights = €30.
- All-in amount shown to the guest: €1,560.
- In-kind hotel cost: breakfast €6 × 5 × 3 = €90.
- Platform fee: €45.90.
- Hotel net: €1,394.10.
- OTA net at rack: €1,320.
- Hotel uplift: €74.10.
- Guest room-price saving: €120.
- Guest perk value: breakfast €180 plus late checkout €75 = €255.

A later counter that cannot improve value returns the standing €1,530 offer with `final: true`.

## 8. Optional rebook rule

Inputs include channel, rate per night, total, dates, refundable flag, and a UTC cancellation-deadline instant.

- Non-refundable bookings are ineligible.
- Cancellation deadlines under 24 hours away are ineligible.
- Never recommend cancellation before the direct booking is confirmed.
- With the current example, the rounded €106 offer remains flexible because it is not below the €104.50 flexible floor. Do not label it NRF.

## 9. Safety

- No WebMCP tool accepts, returns, forwards, logs, or stores payment card data.
- The demo card UI is client-only decoration and sends only name/email plus an opaque checkout token.
- Acceptance is omitted from the WebMCP tool surface and requires the visible checkout UI. Do not claim this proves a physical human click cryptographically.
- Bind visitor holds, sessions, offers, and booking reads to a high-entropy visitor/session token.
- Validate tool input again in application/server code.
- Redact personal data in tool-call logs.
- Cap holds at 12 rooms and 14 nights; cap concurrent sessions per visitor.
- The debug shim is local/test-only and must not be enabled by a public query string in production.
- CORS is an additional browser control, not authentication.

## 10. Gate 0 specification

`/g0` is a client-rendered top-level page. After feature detection it registers:

```js
await document.modelContext.registerTool({
  name: "ping",
  description: "Checks that this top-level Parley page can expose and run a WebMCP site tool.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false
  },
  annotations: { readOnlyHint: true },
  execute: async () => ({
    ok: true,
    human_summary: "pong from Parley",
    next_actions: []
  })
});
```

The page visibly reports whether the API was detected and registration was attempted. It must remain useful as a human-readable diagnostic when the API is absent.

The official OpenAI documentation currently shows an object returned directly from `execute`. It does not document a hard result-size limit or an `unregisterTool` method. Record those as unconfirmed until observed; do not invent them.

## 11. Release priorities

1. Gate 0 runtime proof.
2. Shared schemas and deterministic engine contract.
3. Primary API and persistence.
4. Kit, visible panel, activity timeline, and human flow.
5. Read-only owner ledger.
6. Manual agent run and fixes to descriptions/schemas.
7. README, license detection, video, and Devpost submission.
8. Rebook only if the primary flow is green with sufficient submission buffer.

Feature freeze beats feature count. Submission materials are part of the product.

## 12. Definition of done

- Gate 0 observed green by the human in ChatGPT desktop; Chrome result recorded separately.
- Eight tools registered from top-level JavaScript; none accepts, pays, cancels, or processes card data.
- Primary five-room negotiation shows €1,650 then €1,530, €30 tax, €1,560 all-in, and the corrected €255 perk value.
- The same booking can be completed by visible human controls.
- Owner ledger shows €1,394.10 net and +€74.10 versus OTA.
- Live demo remains available and resettable.
- Public repository includes MIT license, README, decisions, tests, and honest mocked/integration limitations.
- Public narrated video is under three minutes.
- Devpost submission is confirmed before the internal freeze.

