"use client";

import { useEffect, useState } from "react";
import { pingTool, type WebMcpTool } from "./ping-tool";

type ModelContext = {
  registerTool: (tool: WebMcpTool) => void | Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

type Status = "checking" | "unavailable" | "registering" | "registered" | "failed";

let registration: Promise<void> | undefined;

function registerPing(modelContext: ModelContext): Promise<void> {
  if (!registration) {
    registration = Promise.resolve(modelContext.registerTool(pingTool));
  }

  return registration;
}

const statusCopy: Record<Status, string> = {
  checking: "Checking this browser for the WebMCP API…",
  unavailable: "WebMCP API not detected. This is expected in an ordinary browser.",
  registering: "WebMCP detected. Registering the ping tool…",
  registered: "Ping registered. The browser agent can now call it.",
  failed: "WebMCP was detected, but ping registration failed. Check the browser console.",
};

export default function GateZeroPage() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const modelContext = document.modelContext;

      if (!modelContext) {
        setStatus("unavailable");
        return;
      }

      setStatus("registering");

      try {
        await registerPing(modelContext);
        setStatus("registered");
      } catch (error: unknown) {
        console.error("Parley Gate 0 registration failed", error);
        registration = undefined;
        setStatus("failed");
      }
    });
  }, []);

  const successful = status === "registered";

  return (
    <main className="shell">
      <p className="eyebrow">Parley · Gate 0</p>
      <h1>Can this page expose a WebMCP tool?</h1>
      <p className="lede">
        This top-level page registers one read-only tool using the imperative WebMCP API.
      </p>

      <section className="diagnostic" aria-live="polite">
        <span
          aria-hidden="true"
          className={`status-dot ${successful ? "status-dot--good" : ""}`}
        />
        <div>
          <strong>{statusCopy[status]}</strong>
          <p>Tool name: <code>ping</code></p>
        </div>
      </section>

      <section className="instructions">
        <h2>Runtime check</h2>
        <ol>
          <li>Open this deployed page in ChatGPT&apos;s desktop in-app browser.</li>
          <li>Use Sol or Terra on a personal account.</li>
          <li>Ask: “Call the ping tool on this page.”</li>
        </ol>
        <p>The expected summary is <code>pong from Parley</code>.</p>
      </section>
    </main>
  );
}
