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
