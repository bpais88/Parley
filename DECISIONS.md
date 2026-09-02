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
