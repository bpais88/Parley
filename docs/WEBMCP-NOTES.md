# WebMCP runtime notes

## Documentation baseline

Source reviewed before implementation: <https://learn.chatgpt.com/docs/webmcp>

- Registration uses `document.modelContext.registerTool({ ... })` from the top-level page.
- The `execute` callback returns a JSON-serializable object directly.
- ChatGPT's browser does not expose declarative form tools or tools registered in iframes.
- The documented testing runtime is the ChatGPT desktop in-app browser with Sol or Terra on a personal account; Chrome can be tested with `chrome://flags/#enable-webmcp-testing`.
- The official page does not document `unregisterTool` or a hard result-size limit. Both remain unconfirmed.

## Gate 0 implementation

The `/g0` page registers one read-only tool:

```ts
document.modelContext.registerTool({
  name: "ping",
  description: "Checks that this top-level Parley page can expose and run a WebMCP site tool.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  execute: async () => ({
    ok: true,
    human_summary: "pong from Parley",
    next_actions: [],
  }),
});
```

Local production build and HTTP smoke test are green.

## Runtime observations

- Runtime: Codex in-app browser, 2026-09-02 22:48 BST.
- Page status: `Ping registered. The browser agent can now call it.`
- Tool discovered: `ping`, with the expected description, strict empty object schema, `readOnlyHint: true`, origin, and page URL.
- Tool result: `{ ok: true, human_summary: "pong from Parley", next_actions: [] }`.
- Confirmation prompt: none during the direct read-only runtime invocation.
- `unregisterTool`: not observed; still unconfirmed for the ChatGPT subset.
- Result-size behavior: not empirically tested; no platform limit is claimed.
- Connected Chrome result: the page loaded, but `document.modelContext` was absent because WebMCP testing was not enabled in that Chrome profile. This is an environment result, not a registration failure.
- Sol/Terra personal-account rerun and screenshots: still required for final submission evidence.
