# Title

Parley — Negotiable direct booking for the agentic web

# One-line Summary

Parley lets a guest’s browser agent negotiate a better direct hotel stay on the page they are already viewing, while deterministic hotel rules protect the owner’s economics and acceptance remains a visible human action.

# Problem

Hotels routinely give a meaningful share of booking revenue to online travel agencies. Their own websites may show rooms and rates, but they are not places where a guest’s agent can understand the stay currently on screen, hold live inventory, negotiate within hotel-approved rules, and explain the trade-off. Group requests and rebooking a refundable OTA stay still lead to forms, calls, and email chains.

# Solution

Parley turns the hotel’s own page into a shared negotiation surface. The guest gives an agent a brief; page-level WebMCP tools read and update the same stay picker the guest sees, search live inventory, create a temporary hold, request a deterministic offer, and counter. Both sides appear in a visible timeline. The hotel can include low-cost perks before reducing price and enforce a floor that keeps its direct net above the OTA alternative.

The final decision is deliberately outside WebMCP: there is no accept, payment, card, or OTA-cancellation tool. Only the guest can press the visible **Accept & pay** button. The demo checkout collects no card data and makes no charge.

# Why This Matters

Parley uses the commission that would otherwise leave the hotel to create a three-way gain. In the worked group example, the guest’s room total falls from €1,650 to €1,530 and includes breakfast and late checkout. After €90 in-kind cost and a €45.90 platform fee, the hotel nets €1,394.10 instead of €1,320 through an OTA: **+€74.10 for the hotel**.

This is a strong WebMCP fit because the human and agent share the hotel page, session, visible dates, selected room, countdown, and offer history. `set_dates` visibly moves the hotel widget; `hold_rooms` starts its countdown; negotiated terms appear immediately in the panel. Visiting the hotel URL is enough to discover the capabilities. A detached server-side agent integration would not naturally inherit the page the guest chose or make every action visible in that shared interface.

What was previously a phone call or email chain becomes a short collaboration: the human defines the goal and constraints, the guest’s agent handles the structured work, the hotel’s deterministic policy responds within hard economic limits, and the human keeps the consequential veto. The separate Parley homepage uses WebMCP to help a non-technical hotelier turn plain-language preferences into visible, editable rules and a consent-based reservations inbox.

# How We Used AI

AI was used where language and interaction benefit from it: the guest’s browser agent interprets a travel brief, selects the appropriate page tools, and explains price-versus-flexibility trade-offs; the hotelier’s agent maps conversational setup preferences into strict, reviewable form fields. Codex helped implement, inspect, test, and document the product. Instinct was used as an independent native-WebMCP agent for fresh-prompt behavioral and safety runs.

AI is intentionally absent from negotiation math. Prices, floors, perks, eligibility, rounding, and ledger values are deterministic TypeScript with integer-cent arithmetic. No model can silently relax the owner’s rules.

# How We Used Codex

Codex was the build partner across the full vertical slice: monorepo and Next.js scaffolding, WebMCP registration, shared schemas, deterministic engine, Neon/Drizzle persistence, atomic inventory holds, the Shadow DOM hotel panel, owner ledger, hotel onboarding, documentation, browser E2E tests, deployment checks, accessibility review, and the narrated demo cut. It also ran production smoke flows and kept the test and decision logs aligned with what was actually observed.

# Key Features

- Nine imperative WebMCP tools on the hotel page for policy, shared context, dates, availability, holds, offers, counters, status, and confirmation lookup.
- Ten separate WebMCP onboarding tools on Parley’s hotel-facing homepage.
- Live Neon Postgres inventory with concurrency-safe temporary holds.
- Pure deterministic negotiation with whole-euro room-night prices and exact cent-based ledger math.
- Shared two-identity offer timeline, expiry countdown, and WebMCP activity strip.
- Human-only no-charge checkout; no tool or form field accepts card data.
- Rebook-direct guardrails for refundable OTA stays, including “book here first, then cancel there.”
- Hotel owner ledger showing the exact direct-net uplift versus an OTA.
- Level 0 `/.well-known/negotiate.json` discovery convention and integration documentation.
- Hotel onboarding that turns plain-language policy into visible rules while keeping consent and enrollment human-only.

# Architecture

The deployed Next.js App Router application on Vercel serves the public hotelier page, fictional demo hotel, API, owner ledger, documentation, cron handlers, and a small vanilla-TypeScript WebMCP kit. The kit registers tools from top-level page JavaScript and mounts a Shadow DOM panel. Strict shared schemas validate requests and results. A pure TypeScript engine calculates offers. Drizzle persists state in Neon Postgres; a Postgres advisory lock serializes availability checks and hold creation. Vercel Cron expires stale holds and safely restores demo inventory.

The kit is 8.7 KB gzipped. Every result is compact structured JSON with a human summary and next actions. Tool activity is logged with recursive personal/card-field redaction. Checkout tokens are short-lived, single-use, visitor/session-bound, and stored as hashes.

# Testing Instructions

1. Open <https://parleywebmcp.vercel.app/demo> in a WebMCP-capable browser agent.
2. Ask: “Team offsite: five single rooms, 24–27 September 2026. Budget €1,600 all-in. We want breakfast and late checkout Sunday. Don’t book—get me the best deal and tell me the trade-off.”
3. Expected tool path: `get_stay_context` → `set_dates` → `search_availability` → `get_negotiation_policy` → `hold_rooms` → `request_offer` → `counter_offer` → `get_offer_status`.
4. Expected result: €1,530 room charges / €1,560 all-in, prepaid and non-refundable, with breakfast and late checkout. The agent must stop before acceptance and direct the guest to the visible button.
5. If desired, press **Accept & pay** yourself. The no-charge modal contains name and email only. Complete it to create a demo confirmation.
6. Open <https://parleywebmcp.vercel.app/owner>, use passcode `parley-demo-2026`, and verify the booking’s +€74.10 net uplift versus OTA.

For the hotelier side, open <https://parleywebmcp.vercel.app> and ask: “On quiet dates, offer breakfast and late checkout before lowering the price. Never leave me worse off than an OTA booking. Ask me above eight rooms, require prepayment for the deepest discounts, and send guest enquiries to reservations@example.com—but ask the guest first.” The agent should populate visible rules and inbox settings but leave pilot consent and submission untouched.

# Public Demo Link

<https://parleywebmcp.vercel.app>

Guest negotiation demo: <https://parleywebmcp.vercel.app/demo>

# Public Repository Link

<https://github.com/bpais88/Parley>

The repository is public, the latest `main` CI run is green, and GitHub detects the MIT license.

# Demo Video

Public YouTube URL: **TODO — upload the completed 2:13 narrated MP4 and paste the public URL here.**

Local upload source: `artifacts/video/parley-demo-narrated.mp4` (1920×1080, H.264/AAC, 2:13, 6.4 MB).

# Screenshot Shot List

1. Hotel page plus open negotiation panel showing the €1,560 all-in final offer, two-identity timeline, and green WebMCP activity rows.
2. Human-only **Accept & pay** button and no-charge checkout copy.
3. Booking confirmation and deal summary.
4. Owner ledger showing €1,530 revenue, €1,394.10 direct net, and **+€74.10 vs OTA**.
5. Hotelier onboarding page showing the natural-language brief resolved into visible rules and a consent-based reservations inbox.
6. Optional code proof: top-level `document.modelContext.registerTool(...)` registration and the generated tool manifest.

# Submission Readiness Notes

- Official status: registered; submissions are open until 3 September 2026 at 20:00 UTC.
- Live app: reachable and backed by connected Neon inventory.
- Public repository: reachable; MIT detected; latest `main` CI green.
- Automated checks: 31 Vitest tests, four Playwright Chromium flows, typecheck, lint, and production build green at the final regression.
- Native agent evidence: fresh natural-language guest negotiation, flexible-only, refundable rebook, non-refundable guardrail, payment/card refusal, and hotelier onboarding runs passed.
- Remaining blocker: upload the existing narrated MP4 to YouTube as public and add its URL.

# Known Limitations

Casa do Zêzere and its inventory are fictional demo data, and checkout does not process payment. The build supports one property, one Standard room type, and EUR. A real PMS/channel manager, payment provider, hotel staff authentication, multi-property support, delivery to the configured guest-enquiry inbox, the negotiate-anywhere email workflow, and automatic hotel activation are not implemented. The kit and demo site are served from Vercel rather than separate Cloudflare and Netlify origins. These trade-offs are documented in `docs/HACKATHON-TRADEOFFS.md`.

# TODO Official Form Fields

| Field ID | Devpost field | Proposed answer |
|---:|---|---|
| 28249 | Submitter Type | **Individual — confirm before submission** |
| 28250 | Country of residence | **Portugal — confirm before submission** |
| 28251 | Organization name | Leave blank unless submitting for an organization |
| 28252 | App Status | New |
| 28253 | Existing-project changes | Not applicable |
| 28254 | Live URL | `https://parleywebmcp.vercel.app` |
| 28255 | Testing instructions | Use the concise steps in **Testing Instructions** above; owner passcode `parley-demo-2026` |
| 28256 | Public code repo | `https://github.com/bpais88/Parley` |
| 28257 | Agents/clients tested | Codex in-app browser; Instinct native WebMCP browser client. Direct page-tool invocation and fresh natural-language selection were tested. Do not claim a separate ChatGPT Sol/Terra run unless completed before submission. |
| 28258 | AI tools leveraged | OpenAI Codex for implementation, review, browser QA, testing, documentation, deployment verification, and demo production; Instinct for independent native-WebMCP prompt and safety testing. The pricing engine itself uses no AI. |
| 28259 | Learning derived | Significant |
| 28260 | Reusable career AI value | Yes |

Before submission, confirm the two identity fields above and replace the video TODO with the public YouTube URL.
