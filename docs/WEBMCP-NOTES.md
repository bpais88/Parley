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

Local production build and HTTP smoke test are green. Browser discovery and invocation are not inferable from an ordinary browser and must be observed by the participant.

## Human observations — pending

- ChatGPT desktop model/account type:
- Tool discovered:
- Tool result shown:
- Confirmation prompt, if any:
- `unregisterTool` observed:
- Result-size behavior observed:
- Chrome flag result:
- Screenshot locations:
