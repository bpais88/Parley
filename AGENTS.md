# AGENTS.md — Parley WebMCP Challenge build

Read `PRD.md` before the first change. This file governs every task.

## Deadline and scope

- Devpost deadline: 3 Sep 2026, 13:00 PDT / 22:00 CEST / 21:00 BST.
- Internal freeze: 3 Sep 2026, 20:30 CEST / 19:30 BST.
- This is the approved reduced submission scope recorded in `DECISIONS.md`.
- Gate 0 blocks all product work. Stop after the local Gate 0 build and wait for the human deployment/browser result.
- Never silently reduce scope. Record every deviation and reason in `DECISIONS.md`.

## Runtime rules

1. Register WebMCP tools with the imperative `document.modelContext.registerTool(...)` API from top-level page JavaScript. No iframes or declarative tools.
2. The official OpenAI page at `https://learn.chatgpt.com/docs/webmcp` wins over this repository. Record disagreements in `DECISIONS.md`.
3. Primary runtime: the ChatGPT desktop in-app browser using GPT-5.6 Sol or Terra on a personal account. Secondary runtime: Chrome with `chrome://flags/#enable-webmcp-testing`.
4. WebMCP results are JSON objects. Use `{ ok, human_summary, next_actions, ...data }`; return `{ ok: false, error_code, human_summary }` for errors instead of throwing.
5. Result payloads should remain compact. The repository's 4 KB target is an internal budget, not a documented OpenAI platform limit.

## Product boundaries

1. The approved hotel booking surface contains eight tools: `get_stay_context`, `set_dates`, `search_availability`, `hold_rooms`, `request_offer`, `counter_offer`, `get_offer_status`, and `get_booking`. The separate Parley landing page has ten hotel-onboarding tools recorded in `DECISIONS.md`; those tools never book, activate, publish, contact a guest, or submit enrollment.
2. Accept, pay, cancel, and card-entry actions are never tools. The demo checkout is a visible UI action and never sends or stores card data.
3. Describe the hotel side as a deterministic policy engine, not a second autonomous agent.
4. The primary demo is the five-room offsite. Rebook-direct is added only after the primary flow is green.
5. The whole demo flow must also work through visible human controls without an agent.

## Engineering rules

1. `packages/engine` is deterministic pure TypeScript: no LLM, randomness, I/O, or system clock.
2. Store money as integer cents. Display euros with two decimals. Offer prices are whole euros per room-night. Property dates use `YYYY-MM-DD`; expiries use UTC instants.
3. `packages/shared` schemas are the source of truth. Change schemas before consumers.
4. Breakfast cost/value is per guest per night. Late-checkout value is per room per stay.
5. Group escalation begins above eight rooms. The five-room primary demo must not escalate.
6. Rebook's expected €106 offer is flexible under the current price rule; do not label it NRF.
7. Production must never expose the debug shim through `?debug=1`. The shim is local/test-only.
8. Bind booking/session reads to the current visitor and never expose personal data from `get_booking`.
9. Do not invent package versions, model names, or CLI flags. Check current official sources and record selected versions.

## Verification and changes

- Anything requiring deployment, secrets, DNS, or the ChatGPT browser is performed by the human. Print exact steps and expected results, then stop.
- Never mark an unobserved manual gate green.
- After an implementation milestone, run typecheck, lint, and relevant tests; update `TESTLOG.md` and `DECISIONS.md`; commit conventionally.
- Preserve submission time for a public repository, detected MIT license, live URL, public YouTube video under three minutes with audio, English description, and Devpost submission.
