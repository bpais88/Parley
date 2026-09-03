# Parley hackathon trade-offs

**Status:** submission build, 3 September 2026  
**Purpose:** document what Parley proves today, what was deliberately reduced for the WebMCP Challenge, and what remains before a production hotel rollout.

## Executive summary

Parley was built as a complete vertical demonstration rather than a broad but shallow platform. The submission prioritizes the parts that must be real for the thesis to be credible:

- WebMCP tools registered and invoked from the hotel page;
- shared state between the guest, the page, and the browser agent;
- live availability and temporary holds in hosted Postgres;
- deterministic negotiation with exact economic floors;
- a visible, human-only acceptance checkpoint;
- a confirmed demo booking and an owner ledger showing net revenue versus an OTA;
- a hotel-facing onboarding page with reviewable rules and explicit consent.

Everything outside that loop was evaluated against the deadline. Features that required another infrastructure provider, a real commercial account, a broader security model, or a second operational workflow were deferred instead of being mocked and described as complete.

## How scope decisions were made

The build used five priorities, in order:

1. Prove that WebMCP materially improves the experience, rather than adding tools to a conventional form.
2. Preserve the safety model: the agent may research, hold, and negotiate, but may not accept, pay, enter card data, or cancel another reservation.
3. Keep the hotel economics deterministic, explainable, and testable to the cent.
4. Deliver one coherent guest-to-owner journey that works on the deployed product.
5. Cut optional breadth before sacrificing reliability, clarity, or evidence.

## What is real in the submission

The following behavior is live, not a video-only mock:

- The hotel demo registers nine imperative WebMCP tools from top-level page JavaScript.
- The hotel acquisition page registers a separate ten-tool onboarding surface.
- The browser agent and human share dates, room count, offers, countdowns, and the visible timeline.
- Availability, holds, sessions, offers, confirmations, pilot requests, and ledger entries use Neon Postgres.
- Concurrent room holds are protected by a Postgres advisory lock and an availability recheck.
- Negotiation is pure TypeScript with no LLM, randomness, or hidden external decision-making.
- Offer and ledger money uses integer cents and reproduces the worked example exactly.
- Checkout uses a short-lived, single-use, visitor-bound token stored only as a hash.
- Booking lookup is visitor-bound and does not return personal details.
- Tool arguments are redacted before appearing in the activity log.
- Vercel Cron expires stale holds and offers and resets the shared demo safely.
- The owner view reads the confirmed booking economics from the same production database.
- Hotel onboarding stores the reviewed policy rules and consent-based reservations inbox only after visible human approval.

## Deliberate hackathon reductions

| Area | What shipped | What was deferred | Why it was deferred | Production path |
|---|---|---|---|---|
| Guest WebMCP surface | Nine tools covering policy, context, dates, availability, holds, offers, counters, status, and booking lookup | `compare_rate_plans`, `highlight_room`, and `add_special_request` from the original 12-tool proposal | The nine-tool set completes the core negotiation journey and preserves the policy-discovery prompt while limiting overlapping choices | Add the three deferred read/UI tools after prompt-level evaluation confirms they improve selection rather than confuse it |
| Inventory breadth | One Standard room type, one property, EUR | Superior and Suite categories, multi-property, multi-currency, and localization | Extra catalog breadth did not prove a different WebMCP capability and multiplied seed, pricing, and UI cases | Introduce property-scoped catalog and currency configuration behind the existing shared schemas |
| Hotel website hosting | Demo hotel and kit served from the same Vercel deployment | Separate Netlify hotel deployment and Cloudflare edge distribution for the kit | Cross-provider deploys, DNS, and cache invalidation created deadline risk without changing the product loop | Publish the static hotel separately, serve versioned kit assets at the edge, and retain origin allowlists |
| Booking-engine integration | Seeded live inventory and a documented integration contract | Mews, apaleo, Cloudbeds, SiteMinder, Channex, or another real PMS/channel manager | Each vendor requires credentials, commercial setup, and vendor-specific reservation semantics | Replace seeded ARI with a property adapter; redeem accepted offers as a single-use rate code or tentative reservation in the existing booking engine |
| Payments | Visible human checkpoint and demo confirmation; no card fields exist | Real authorization, capture, refunds, chargebacks, and payment-provider webhooks | Real payments are unnecessary to prove WebMCP negotiation and would add disproportionate compliance and failure risk | Hand accepted offers to the hotel's existing PCI-compliant checkout or a payment-service-provider hosted page |
| Hotel onboarding | Ten page tools, visible rule cards, copy-ready Level 0 JSON, consent, and persisted pilot request | Automatic tenant provisioning, domain verification, script installation, and production activation | Provisioning without operational review would create false confidence and unsafe defaults | Add an internal approval queue, property-key issuance, verified domains, installation checks, and an activation checklist |
| Natural-language policy setup | The browser agent maps hotelier language into strict, visible, editable rule fields | A server-side LLM parser inside an ordinary browser session | The deterministic form and WebMCP path were sufficient; an LLM dependency was not allowed to become part of pricing logic | Use OpenAI structured outputs only to prefill schemas, require owner review, and keep the deterministic engine unchanged |
| Guest enquiry inbox | Hotel stores an inbox and an `ask_each_time` or `do_not_collect` policy | Delivering guest enquiries to that inbox | Outbound email requires domain authentication, bounce handling, abuse controls, and a complete guest-consent event | Record the guest's explicit consent, send through a verified transactional provider, log delivery, and provide unsubscribe/retention controls where applicable |
| Negotiate-anywhere | Level 0 discovery file and documentation | `/negotiate`, outbound hotel email, and `/r/[token]` hotel response pages | This is a second end-to-end workflow and depends on real email infrastructure | Build it after the embedded hotel flow, with one request per guest/stay and verified hotel contact addresses |
| Owner operations | Passcode view, ledger, booking economics, activity, and demo reset | Editable policy administration, escalation inbox, approve/counter/decline flow, and owner WebMCP tools | The submission needed owner-side evidence more than a complete back office | Add authenticated staff roles, auditable policy versions, escalation SLAs, and confirmation for consequential owner actions |
| Escalations | The engine identifies requests that need the owner | Durable escalation records, notifications, owner resolution UI, and timed demo auto-approval | A reliable human-response workflow would require more state and notification infrastructure than the deadline allowed | Persist escalations, notify configured staff, expose structured responses, and expire or auto-resolve only under explicit property policy |
| Level 0 convention | Public `/.well-known/negotiate.json` plus specification and integration documentation | Remote URL validator endpoint and ecosystem discovery service | The static convention itself is the useful artifact; remote fetching adds SSRF and abuse considerations | Add a hardened validator with DNS/IP protections, strict size limits, schema versioning, and caching |
| Authentication | Visitor cookie for guest isolation and a published demo owner passcode | Hotel staff accounts, SSO, recovery, roles, and audit sessions | Full identity infrastructure is outside the proof and would make the public demo harder to judge | Add managed authentication, property memberships, least-privilege roles, revocation, and durable sessions |
| Rate limiting and abuse | Basic per-instance write limits plus database constraints | Distributed limits, bot defense, reputation, quotas, and fraud detection | In-memory limits are adequate only for the small demo load | Move limits to a shared edge/data store, add property and IP dimensions, and monitor hold/session abuse |
| Observability | Redacted tool-call activity, health endpoint, CI, and test log | Production tracing, alerting, SLOs, analytics, and support tooling | The hackathon required evidence, not a 24/7 operating model | Add structured traces across tool/API/database boundaries, error budgets, alerts, dashboards, and incident runbooks |

## Product boundaries that are not shortcuts

Some omissions are core design decisions and should not be described as missing functionality:

### Acceptance and payment are not tools

The absence of `accept`, `pay`, card-entry, and external-cancellation tools is intentional. The browser agent may bring the guest to a decision, but the guest must review the visible offer and act in the panel. A production payment integration would preserve this boundary.

### Negotiation math does not use an LLM

The engine is deterministic by design. A hotel can inspect its commission assumption, minimum uplift, discount caps, perk costs, and escalation threshold. Language models may help translate hotelier prose into a draft policy, but they do not decide the price.

### The demo does not cancel an OTA reservation

For rebook-direct requests, Parley says to book direct first and cancel the other reservation afterward. It never claims to cancel on the guest's behalf, and it refuses non-refundable or near-deadline cases according to the configured guardrails.

### Demo checkout does not imitate card processing

The form is deliberately labelled as a no-charge demo and contains no fake card capture. This keeps the judged interaction honest and prevents payment data from entering tools, logs, or the demo database.

## Known UX and operational debt

The vertical flow works, but a production release should also address:

- progressive disclosure on the long mobile hotel-onboarding page;
- plain-language labels for raw WebMCP activity outside judge/debug views;
- persistent owner sessions rather than requiring the passcode after refresh;
- a shorter empty state in the mobile negotiation panel;
- distributed rate limits and deletion/retention policies for operational data;
- the remaining contrast and landmark issues on the demo hotel page;
- separation of demo activity from real property activity;
- property activation, domain verification, support, and rollback procedures.

## Recommended post-hackathon order

1. Fix the final accessibility and comprehension issues found in the UX review.
2. Add durable hotel staff authentication, policy editing, and escalation resolution.
3. Build one real PMS or booking-engine adapter and hand accepted offers to its hosted checkout.
4. Complete verified, consented enquiry delivery with operational logging.
5. Separate the kit onto a versioned edge origin and prove cross-origin installation on an independent hotel site.
6. Restore the three deferred guest tools only after conversational tool-selection tests.
7. Add multi-room-type and multi-property support.
8. Build negotiate-anywhere and broader Level 0 discovery after the embedded flow is operating reliably.

## How to describe the submission accurately

Parley is a deployed, database-backed proof of negotiable direct booking over WebMCP. It demonstrates the complete decision loop—guest brief, live hold, deterministic offer, counter, human acceptance, confirmation, and hotel economics—using a fictional property and no-charge checkout. It is not yet a production booking engine, payment processor, PMS integration, email-delivery platform, or multi-property hotel back office.

That boundary is deliberate: the hackathon build proves the interaction model and economics without pretending that regulated payments, hotel operations, and third-party integrations can be compressed into a one-day implementation.
