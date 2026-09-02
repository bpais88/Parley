# Test log

## Gate 0 — WebMCP runtime proof

- Status: PENDING
- Local typecheck: GREEN — `pnpm typecheck`, 2026-09-02 22:17 BST.
- Local lint: GREEN — `pnpm lint`, 2026-09-02 22:17 BST.
- Local tests: GREEN — `pnpm test`, 2026-09-02 22:17 BST; one Gate 0 contract test passed.
- Local production build: GREEN — `pnpm build`, Next.js 16.3.4, 2026-09-02 22:17 BST.
- Local HTTP smoke: GREEN — `GET /g0` returned 200 and contained the expected diagnostic copy, tool name, and test prompt, 2026-09-02 22:16 BST.
- Initial Vercel production deployment: RED — install completed but Vercel did not detect Next.js from the nested app manifest, 2026-09-02 22:33 BST. Root detection metadata corrected.
- Vercel production deployment retry: GREEN — build completed and `https://parley-delta.vercel.app/g0` returned HTTP 200 in 0.40 seconds with the expected diagnostic content, 2026-09-02 22:34 BST.
- ChatGPT desktop / Sol or Terra: NOT OBSERVED
- Chrome WebMCP testing flag: NOT OBSERVED
- Screenshots: PENDING
- Notes: Never mark this gate green without the participant's observed browser results.
