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
