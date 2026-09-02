export type PingResult = {
  ok: true;
  human_summary: "pong from Parley";
  next_actions: [];
};

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, never>;
    additionalProperties: false;
  };
  annotations: { readOnlyHint: true };
  execute: () => Promise<PingResult>;
};

export const pingTool = {
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
} satisfies WebMcpTool;
