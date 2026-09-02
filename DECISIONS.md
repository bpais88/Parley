# Decisions

## 2026-09-02 — Scope reset before implementation

The original PRD was rejected as infeasible within the remaining hackathon time. The participant explicitly approved the following changes before any code was written:

- Reduce the mandatory WebMCP surface from 12 tools to eight coherent tools.
- Use one Vercel deployment; cut Cloudflare, Netlify, Resend/email, LLM policy parsing, editable owner setup, escalation UI, and remote Level 0 validation.
- Make the five-room offsite negotiation the primary demo. Rebook-direct is conditional on the primary flow being green.
- Use one Standard room type.
- Change the all-in budget prompt from €1,550 to €1,600 because €1,530 room charges plus €30 city tax equals €1,560.
- Change the group escalation threshold to above eight rooms so the five-room demo does not contradict policy.
- Treat breakfast cost/value per guest per night and late-checkout value per room per stay. Correct worked-example guest perk value from €405 to €255.
- Keep the €106 rebook example flexible under the stated threshold rather than incorrectly labelling it NRF.
- Describe the hotel side as a deterministic policy engine, not a second autonomous agent.
- Describe acceptance as excluded from the tool surface, not as cryptographic proof of a physical click.
- Keep all debug shims local/test-only.

Reason: maximize a complete, truthful, testable WebMCP experience and preserve submission time.

## 2026-09-02 — Official WebMCP contract for Gate 0

Source: https://learn.chatgpt.com/docs/webmcp

- Use `document.modelContext.registerTool({...})` from top-level JavaScript after feature detection.
- `execute` returns a JSON-serializable object directly.
- ChatGPT's built-in browser does not expose declarative form tools or tools registered in iframes.
- Use Sol or Terra for testing; Luna currently has WebMCP disabled.
- The OpenAI page does not document `unregisterTool` or a hard result-size limit. Treat both as unconfirmed. The 4 KB project limit is an internal payload budget.

## 2026-09-02 — Gate 0 toolchain versions

Versions were read from the npm registry immediately before scaffolding:

- Node.js `23.3.0` and pnpm `10.29.3` on the development machine.
- Next.js `16.3.4`; React and React DOM `19.2.8`.
- TypeScript `6.0.3` instead of current `7.0.2`, matching the `<6.1.0` peer range of the TypeScript ESLint packages used by Next.js; Playwright `1.62.1`.
- Vitest `3.2.7` instead of current `4.1.11` because Vitest 4 excludes the development machine's Node.js 23 runtime.
- ESLint `9.39.5` instead of current `10.9.1` because ESLint 10 excludes Node.js 23; `eslint-config-next` remains `16.3.4`.

Exact dependency versions are committed in the workspace manifests and lockfile. If a compatibility check rejects one of the newest independent tools, pin the newest compatible release and record it here.

## 2026-09-02 — Vercel workspace detection

The Vercel project deploys from the repository root so it can install the committed pnpm workspace and lockfile. Vercel's Next.js framework detector requires `next` in the root manifest even though the application owns the same pinned dependency under `apps/platform`. The root therefore lists Next.js `16.3.4` as a development dependency; the production build still runs only `@parley/platform` and outputs `apps/platform/.next`.

The participant's canonical Vercel project is `parleywebmcp`. Its Root Directory is the repository root; the stable production alias is `https://parleywebmcp.vercel.app`.

## 2026-09-02 — Shared contracts and deterministic engine

- Zod `4.5.4`, the current registry release checked at implementation time, owns the strict runtime schemas in `packages/shared`.
- Perk schemas carry an explicit unit. Breakfast uses `guest_night`; late checkout uses `room_stay`. Ledger and monotonic-value calculations use those units rather than multiplying every perk by room-nights.
- Floor components retain cent precision, then the final offered per-room-night price is rounded upward to a whole euro. Thus the €104.50 flexible floor becomes a minimum whole-euro offer of €105, while the rebook target €105.60 becomes €106.
- `guest_value_score_cents` measures total stay value: room-price savings across all room-nights plus the correctly unitized included-perk value.
- A counter that cannot strictly improve total guest value returns the standing offer. At the final configured round it is marked `final` with reason `final_offer`.
- Blackout ranges are represented as half-open property-local date intervals: `date_from` is included and `date_to` is excluded.

## 2026-09-02 — Reduced platform persistence

- Selected current registry releases after checking their official documentation: Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, Neon serverless driver `1.1.0`, and `tsx` `4.23.13`.
- The platform uses Drizzle's Neon HTTP driver because the API consists of short serverless queries and batches. `DATABASE_URL` is read lazily so static builds succeed before the human connects Neon.
- The Postgres best-practices guidance shaped the schema: timezone-aware timestamps, integer cents, database checks, indexed foreign keys, composite indexes matching access paths, and short operations.
- Externally exposed rows use UUID primary keys for compact hackathon implementation. This accepts UUIDv4 index locality costs because the dataset is deliberately tiny; a production design would use UUIDv7 or internal identity keys plus public IDs.
- Hold creation is a single Postgres function guarded by a property-scoped transaction advisory lock. Availability is rechecked under that lock before insertion, preventing concurrent holds from overselling the 12-room inventory.
- The checkout token is stored only as a SHA-256 hash, is visitor/session-bound, expires no later than the offer, and is consumed with booking creation. No card field exists in schemas or routes.

## 2026-09-02 — Reduced WebMCP kit and demo surface

- esbuild `0.28.2`, checked against the npm registry at build time, produces one minified IIFE. The committed browser asset is 22.7 KB raw and 7.8 KB gzipped, well below the 60 KB budget.
- The static manifest is the single registration list for the approved eight tools. The production kit maps that list directly to `document.modelContext.registerTool`; the generated `tools.manifest.json` is committed for judge and test inspection.
- The `?debug=1` shim activates only on `localhost` or `127.0.0.1`. There is no public query-string bypass in the deployed build.
- The visible checkout contains only guest name and email. It obtains a short-lived checkout token after the human presses the offer button; it has no card field and clearly states that no charge is made.
- The first demo remains on the Vercel origin. The Level 0 file advertises the open discovery convention, but no email channel or remote validator is claimed in the reduced scope.

## 2026-09-02 — Hosted database

- Provisioned a Neon Free database through the Vercel Marketplace in `lhr1` and connected it to production, preview, and development for the canonical `parleywebmcp` project.
- Neon authentication was disabled because Parley owns its visitor-cookie and owner-passcode boundaries; no separate end-user authentication product is needed for this demo.
- The owner demo passcode is `parley-demo-2026`. The cron secret is generated, sensitive, and never committed.

## 2026-09-02 — Owner evidence and public documentation

- The reduced owner surface is intentionally read-focused: passcode gate, aggregate economics, expandable booking ledger, last 200 redacted tool calls, and explicit demo reset. Editable policy setup and escalation handling remain cut.
- The documentation renderer is a small local Markdown subset rather than a new runtime dependency. RFC, Level 0, and integration documents are prerendered from the committed root files.
- The README names every cut and mock explicitly. It does not claim the optional Cloudflare, Netlify, email, LLM, payment, or PMS work from the original draft.
