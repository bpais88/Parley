# Test log

## Gate 0 — WebMCP runtime proof

- Status: GREEN for deployed in-app discovery and invocation; submission screenshot follow-up remains.
- Local typecheck: GREEN — `pnpm typecheck`, 2026-09-02 22:17 BST.
- Local lint: GREEN — `pnpm lint`, 2026-09-02 22:17 BST.
- Local tests: GREEN — `pnpm test`, 2026-09-02 22:17 BST; one Gate 0 contract test passed.
- Local production build: GREEN — `pnpm build`, Next.js 16.3.4, 2026-09-02 22:17 BST.
- Local HTTP smoke: GREEN — `GET /g0` returned 200 and contained the expected diagnostic copy, tool name, and test prompt, 2026-09-02 22:16 BST.
- Initial Vercel production deployment: RED — install completed but Vercel did not detect Next.js from the nested app manifest, 2026-09-02 22:33 BST. Root detection metadata corrected.
- Vercel production deployment retry: GREEN — build completed and `https://parley-delta.vercel.app/g0` returned HTTP 200 in 0.40 seconds with the expected diagnostic content, 2026-09-02 22:34 BST.
- Canonical `parleywebmcp` deployment: GREEN — corrected its doubled Root/Output Directory configuration, deployed successfully, and verified `https://parleywebmcp.vercel.app/g0` returned HTTP 200 in 0.41 seconds with the expected diagnostic content, 2026-09-02 22:39 BST.
- Codex in-app browser: GREEN — deployed page showed registration success, exposed `ping`, and returned `{ ok: true, human_summary: "pong from Parley", next_actions: [] }`, 2026-09-02 22:48 BST.
- ChatGPT desktop / Sol or Terra personal account: NOT OBSERVED; must be rerun for submission evidence.
- Connected Chrome profile: OBSERVED — page loaded but the WebMCP API was absent because the testing flag was not enabled, 2026-09-02 22:49 BST. Flag-enabled rerun remains.
- Screenshots: PENDING
- Notes: Product work may proceed based on direct first-party in-app discovery and invocation. Do not claim the Sol/Terra or flag-enabled Chrome runs until separately observed.

## Gate 1 — Shared schemas and deterministic engine

- Status: GREEN
- Typecheck: GREEN — `pnpm typecheck`, 2026-09-02 22:54 BST.
- Lint: GREEN — `pnpm lint`, 2026-09-02 22:54 BST.
- Tests: GREEN — `pnpm test`, 22 tests passed across two files, 2026-09-02 22:54 BST.
- Production build regression: GREEN — `pnpm build`, 2026-09-02 22:54 BST.
- Worked example: GREEN — offer 1 €1,650 room total; offer 2 €1,530 room total / €1,560 including €30 city tax; ledger gross €1,530, in-kind €90, fee €45.90, net €1,394.10, OTA rack net €1,320, uplift €74.10, guest saving €120, corrected perk value €255; later counter returns the final standing offer.
- Rebook example: GREEN — €106/night, €212 total, breakfast included, flexible terms, `beat_ota`, and “book here first, then cancel there” guardrail.
- Additional coverage: occupancy bands, economic/cash/flexible floors, perk keep/drop behavior, high-occupancy zero-cost perks, monotonicity, strict inputs, owner escalation triggers, non-refundable rejection, and cancellation-deadline rejection.

## Gate 2 — Reduced platform database and API

- Status: PARTIAL — implementation is locally verified; live database execution is not yet observed.
- Schema: GREEN — nine constrained/indexed tables plus the atomic `parley_create_hold` function generated in two migrations.
- Migration consistency: GREEN — `drizzle-kit check`, 2026-09-02 23:04 BST.
- Seed: IMPLEMENTED — Casa do Zêzere, 120 nights from 2026-09-01, worked-example nights at five rooms sold (~42%), blackout at 11/12 rooms, other dates at five or eight rooms sold. Not executed without `DATABASE_URL`.
- API build: GREEN — bootstrap, availability, atomic holds, sessions, counters, status/expiry, panel checkout token, human acceptance, visitor-bound booking read, owner ledger, redacted tool activity, health, expiry cron handler, and authorized demo reset.
- Safety unit tests: GREEN — recursive personal/card-field redaction, token hashing, rate limiting, and property-date range behavior.
- Full verification: GREEN — `pnpm typecheck`, `pnpm lint`, `pnpm test` (26 passed), and `pnpm build`, 2026-09-02 23:04 BST.
- Pending before Gate 2 can be green: connect Neon, set `DATABASE_URL`, migrate, seed, run database integration cases, configure `OWNER_PASSCODE` and `CRON_SECRET`, redeploy, and verify `/api/v1/health`.

### Gate 2 infrastructure follow-up

- Neon provisioning: GREEN — Free plan, London region, connected to production/preview/development through Vercel Marketplace, 2026-09-02 23:18 BST.
- Migrations: GREEN — both committed Drizzle migrations and the atomic hold function applied to hosted Neon, 2026-09-02 23:19 BST.
- Seed first run: RED — the development runner treated the script as CommonJS and rejected top-level await. The seed entry point was wrapped in an explicit async function.
- Seed retry: GREEN — 120 Casa do Zêzere inventory nights inserted into hosted Neon, 2026-09-02 23:20 BST.
- Secrets: GREEN — owner demo passcode configured for all environments and a generated sensitive cron secret configured for production.
- Remaining: redeploy with the new environment, verify health, and execute the real API sequence.

### Gate 2 live verification

- Production health: GREEN — hosted Neon connected, 60 inventory nights checked, minimum availability one room including the blackout window, 2026-09-02 23:22 BST.
- Real production flow: GREEN — availability → five-room hold → first offer €1,650 room / €1,680 all-in → €1,400 prepaid counter → second offer €1,530 room / €1,560 all-in NRF with breakfast and late checkout → status → checkout token → booking `confirmed` → visitor-bound booking read → owner ledger, 2026-09-02 23:23 BST.
- Ledger: GREEN — production acceptance wrote `uplift_vs_ota_cents: 7410`; the passcode-protected owner ledger returned the same €74.10 total.
- Demo reset first live run: RED — Postgres rejected a qualified target column in the raw `UPDATE ... SET` clause. The target was changed to unqualified `rooms_sold` as PostgreSQL requires.
- Demo reset retry against hosted Neon: GREEN — state cleared and inventory restored; health remained green, 2026-09-02 23:26 BST.
- Status: GREEN for the reduced Gate 2. Concurrency stress and scheduled-cron observation remain soak tasks, not assumed.

## Gate 3 — Reduced WebMCP kit and hotel demo

- Status: PARTIAL — contract, browser registration, panel rendering, and mocked E2E are green; a live database-backed negotiation is pending Gate 2.
- Kit build: GREEN — one minified IIFE, 22,689 bytes raw / 7,828 bytes gzipped, 2026-09-02 23:14 BST.
- Manifest contract: GREEN — eight unique approved tools; descriptions ≥40 characters; strict top-level object schemas; correct read annotations; write side effects described; no accept/pay/card/cancel tool.
- In-app browser registration: GREEN — local `/demo` exposed all eight page tools from the top-level kit script, 2026-09-02 23:12 BST.
- Visual smoke: GREEN — hotel landing page and 420 px Shadow DOM panel rendered together; stay picker, two-identity timeline, activity strip, and unavailable-database error state were legible, 2026-09-02 23:12 BST.
- Playwright setup: initial run was blocked because the pinned Chromium binary was absent; Playwright Chromium 1234 was installed and the same run was repeated.
- E2E: GREEN — two Chromium tests passed in 2.6 s: the localhost-only shim drove all negotiation stages and asserted €1,650 → €1,530 room totals / €1,560 all-in; the separate clicks-only flow reached confirmation and verified that the checkout has no card data and processes no payment, 2026-09-02 23:13 BST.
- Full local regression: GREEN — `pnpm typecheck`, `pnpm lint`, `pnpm test` (28 tests), and `pnpm build`, 2026-09-02 23:11 BST.
- Pending before Gate 3 can be fully green: live seeded API run, deployed `/demo` tool sequence in the target ChatGPT browser, checkout confirmation against Neon, and submission screenshots.

### Gate 3 live verification

- Deployed `/demo`: GREEN — canonical Vercel page loaded without the database error and exposed all eight registered tools in the Codex in-app browser, 2026-09-02 23:23 BST.
- Direct site-tool invocation: GREEN — `get_stay_context` returned the visible five-room 24–27 Sep stay, seeded property, next actions, and explicit human-only acceptance/payment/cancellation boundary.
- Production HTTP checkout: GREEN — the separate live API run confirmed the negotiated booking and exact ledger values; visible browser checkout still needs a target ChatGPT manual screenshot run.
- Status: PARTIAL — production data and tool registration are live; judge-prompt behavior and screenshots remain manual Gate 4 evidence.

## Reduced owner panel and public docs

- Owner panel build: GREEN — passcode gate, aggregate net-vs-OTA card, expandable per-booking economics, redacted activity list, and confirmed reset action.
- Owner E2E: GREEN — mocked ledger rendered booking `CZ-7F3K`, recent `counter_offer`, and `+€74.10`; total browser E2E is now three passing tests, 2026-09-02 23:27 BST.
- Docs build: initial RED — the renderer resolved root docs relative to `apps/platform`; corrected to the repository root. Retry GREEN with `/docs/rfc`, `/docs/level0`, and `/docs/integration` prerendered.
- README: GREEN — live links, three-minute prompt, exact economics, eight-tool table, architecture, safety, mocks/cuts, commands, and test matrix are committed.
- Regression: GREEN — typecheck, lint, production build, 28 Vitest tests, and three Playwright tests, 2026-09-02 23:27 BST.

## Live browser walkthrough

- WebMCP sequence: GREEN — the deployed in-app browser called `set_dates`, `search_availability`, `hold_rooms`, `request_offer`, `counter_offer`, and `get_offer_status` against hosted Neon. The visible panel showed both identities, six green activity rows, a 14-minute hold, and the €1,560 all-in NRF offer.
- Human checkpoint: GREEN — the visible Accept & pay button opened a modal containing name/email only and the explicit “no charge · no card details collected” notice. No acceptance or payment tool existed.
- Confirmation: GREEN — human click created booking `CZ-A615C9`; the panel showed €1,560 all-in and “No payment was processed”; the page's `get_booking` WebMCP tool read the same visitor-bound confirmation.
- Owner economics: GREEN — the deployed passcode view showed one booking, €1,530 gross, €1,394.10 hotel net, +€74.10 vs OTA, and the seven-call activity trail.
- Demo readiness: GREEN — the explicit owner reset succeeded afterward, returning the shared demo to seeded availability.
- Manual evidence still required: run the natural-language judge prompt in a fresh ChatGPT Sol/Terra personal-account tab and retain the screenshots/model/timing. Direct site-tool runtime invocation is observed; conversational tool selection is not yet claimed.
- Active-run cron safety: GREEN — with one live hosted-database hold, the scheduled GET reset returned `skipped: true`; the explicit owner POST reset then cleared state successfully, 2026-09-02 23:32 BST.
- Rebook-direct production path: GREEN — for 17–19 Oct, one refundable Booking.com room at €120/night produced a `beat_ota` flexible offer at €111/night plus tax with breakfast and the mandatory “book here first, then cancel there” wording. The 8% discount reflects the seeded weekend occupancy band; the isolated 42% engine fixture remains €106.
- Concurrent oversell check: GREEN — two different visitors simultaneously requested seven of seven available rooms; the advisory-lock path returned one 201 hold and one 409 `not_available`, never fourteen held rooms. Demo reset then restored seven available rooms and the 42% worked-example occupancy.

## Repository preflight

- GitHub visibility: GREEN — <https://github.com/bpais88/Parley> is public.
- License detection: GREEN — GitHub reports MIT.
- CI: GREEN — latest `main` workflow completed successfully.

## Hotel acquisition landing page

- Status: GREEN locally and in production.
- Product surface: GREEN — responsive root landing page, hotel economics, live demo and docs paths, copy-ready Level 0 manifest, provisioned-key install explanation, agent activity, and human pilot form, 2026-09-03 05:34 BST.
- WebMCP contract: GREEN — eight landing-page onboarding tools discovered from top-level page JavaScript; `get_parley_overview`, `set_hotel_profile`, and `prepare_pilot_signup` were directly invoked in Chromium. The prepared form visibly retained an unchecked consent box and disabled submit button.
- Accessibility: GREEN — axe 4.12.1 reported zero violations after contrast and keyboard-scroll corrections. The remaining gradient contrast checks are indeterminate, not failures.
- Responsive smoke: GREEN — desktop full-page and 390×844 captures rendered without clipping; mobile `scrollWidth` equaled `clientWidth` at 390 px.
- Persistence: GREEN — migration `0002_brave_switch.sql` applied to hosted Neon. A consented API request inserted successfully, and its explicit `qa-landing@parley.invalid` row was immediately deleted.
- Regression: GREEN — `pnpm build:kit` (7,824 bytes gzipped), `pnpm typecheck`, `pnpm lint`, `pnpm test` (31 tests), `pnpm e2e` (3 Chromium flows), and `pnpm build`, 2026-09-03 05:36 BST.
- Existing demo polish: GREEN — offer explanations now humanize perk codes and the kit's previously flagged small labels/offer overline use higher-contrast colors; the full clicks-only, agent-shim, and owner-ledger E2E suite remained green.
- Production deployment: GREEN — canonical `https://parleywebmcp.vercel.app` serves the landing page; `/api/v1/health` reports connected Neon and ready inventory, 2026-09-03 05:38 BST.
- Production WebMCP: GREEN — exactly eight onboarding tools were discovered on `/`; `get_parley_overview` returned the live demo URL, two onboarding paths, and the explicit human-only boundary. Navigating to `/demo` replaced them with exactly the approved eight hotel tools, with no mixed tool surface.
- Production browser QA: GREEN — zero page errors and zero axe violations. Full-page evidence retained at `dogfood-output/screenshots/landing-production-full.png`.

### Hotelier-language and rule setup follow-up

- Content: GREEN — hero, workflow, setup labels, and website handoff were rewritten in hotel-operating language; natural-language example visibly resolves into six concrete rule cards.
- WebMCP: GREEN locally — exactly ten landing tools discovered. `configure_negotiation_rules` changed the visible uplift to 7%, quiet-date cap to 10%, perks to breakfast + parking, owner review to six rooms, prepayment threshold to 6%, and voice. `set_guest_enquiry_inbox` filled `reservations@harbour.example` and enabled ask-each-time consent without sending email.
- Human boundary: GREEN — pilot consent remained unchecked and submission disabled after the agent tool calls. Enquiry copy and tool result both state that no guest details are shared without a clear yes and no message is sent before activation.
- Persistence: GREEN — migration `0003_lovely_killer_shrike.sql` applied to hosted Neon with a backfill-safe two-step NOT NULL change. The live schema accepted a full rules+inbox pilot request; its exact `qa-rules@parley.invalid` row was immediately removed.
- Browser: GREEN — desktop visual review is coherent, 390 px viewport has no horizontal overflow, and axe 4.12.1 reports zero violations.
- Regression: GREEN — typecheck, lint, 31 Vitest tests, three Chromium E2E flows, and the Next.js production build, 2026-09-03 05:56 BST.
- Production: GREEN — the canonical landing page exposes exactly ten onboarding tools. Direct calls to `get_parley_overview`, `configure_negotiation_rules`, and `set_guest_enquiry_inbox` returned structured results and updated the shared visible form; `activated` stayed false and the human pilot consent remained unchecked.
- Production browser: GREEN — axe 4.12.1 reported zero violations, the 390 px viewport had no horizontal overflow, and `/api/v1/health` reported connected Neon with ready inventory, 2026-09-03 05:59 BST.
