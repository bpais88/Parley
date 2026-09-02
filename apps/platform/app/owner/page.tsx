"use client";

import { useCallback, useState, type FormEvent } from "react";
import styles from "./page.module.css";

type ApiResult = Record<string, unknown> & { ok: boolean; human_summary: string };
type LedgerRow = {
  booking_ref: string;
  created_at: string;
  stay: { check_in: string; check_out: string; rooms: number };
  offer: { total_cents: number; inclusions: string[]; rate_plan: string };
  ledger: {
    gross_cents: number;
    inkind_cost_cents: number;
    platform_fee_cents: number;
    net_cents: number;
    ota_net_at_rack_cents: number;
    uplift_vs_ota_cents: number;
  };
};
type ToolCall = { id: number; tool: string; ok: boolean; latency_ms: number; created_at: string };

const euro = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function OwnerPage() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [totals, setTotals] = useState({ bookings: 0, gross_cents: 0, net_cents: 0, uplift_vs_ota_cents: 0 });

  const load = useCallback(async (secret: string) => {
    setLoading(true);
    setError("");
    const headers = { "x-owner-passcode": secret };
    const [ledgerResponse, callsResponse] = await Promise.all([
      fetch("/api/v1/owner/ledger", { headers }),
      fetch("/api/v1/tool-calls", { headers }),
    ]);
    const ledgerData = (await ledgerResponse.json()) as ApiResult;
    const callsData = (await callsResponse.json()) as ApiResult;
    if (!ledgerData.ok || !callsData.ok) {
      setAuthorized(false);
      setError(ledgerData.ok ? callsData.human_summary : ledgerData.human_summary);
    } else {
      setAuthorized(true);
      setTotals(ledgerData.totals as typeof totals);
      setLedger(ledgerData.bookings as LedgerRow[]);
      setCalls(callsData.calls as ToolCall[]);
    }
    setLoading(false);
  }, []);

  const login = (event: FormEvent) => {
    event.preventDefault();
    void load(passcode);
  };

  const reset = async () => {
    if (!window.confirm("Reset demo inventory and clear demo bookings?")) return;
    const response = await fetch("/api/v1/demo-reset", {
      method: "POST",
      headers: { "x-owner-passcode": passcode },
    });
    const result = (await response.json()) as ApiResult;
    if (!result.ok) setError(result.human_summary);
    else await load(passcode);
  };

  if (!authorized) {
    return <main className={styles.loginWrap}>
      <form className={styles.login} onSubmit={login}>
        <div className={styles.brand}>PARLEY · OWNER</div>
        <h1>Casa do Zêzere</h1>
        <p>See what the policy engine offered, what direct bookings netted, and every WebMCP move.</p>
        <label htmlFor="passcode">Demo passcode</label>
        <input id="passcode" type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="current-password" required />
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={loading}>{loading ? "Opening…" : "Open owner view"}</button>
      </form>
    </main>;
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div><div className={styles.brand}>PARLEY · OWNER</div><div className={styles.hotel}>Casa do Zêzere</div></div>
        <button className={styles.reset} type="button" onClick={() => void reset()}>Reset demo</button>
      </header>
      <section className={styles.intro}>
        <div><p className={styles.eyebrow}>Direct-booking economics</p><h1>The commission, shared.</h1></div>
        <p>Every offer obeys one hard floor: after perks and Parley&apos;s fee, the hotel must beat what the OTA would have paid.</p>
      </section>
      {error ? <p className={styles.error}>{error}</p> : null}
      <section className={styles.metrics} aria-label="Ledger totals">
        <div className={styles.metric}><span>Net vs OTA</span><strong>+{euro(totals.uplift_vs_ota_cents)}</strong></div>
        <div className={styles.metric}><span>Direct bookings</span><strong>{totals.bookings}</strong></div>
        <div className={styles.metric}><span>Room revenue</span><strong>{euro(totals.gross_cents)}</strong></div>
        <div className={styles.metric}><span>Hotel net</span><strong>{euro(totals.net_cents)}</strong></div>
      </section>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Booking ledger</h2><div className={styles.subtle}>Open a booking to inspect the economics.</div>
          {!ledger.length ? <p className={styles.empty}>No demo bookings yet. Complete the hotel flow and this ledger will move.</p> : ledger.map((row) =>
            <details className={styles.booking} key={row.booking_ref}>
              <summary><div><strong>{row.booking_ref}</strong><small>{row.stay.rooms} rooms · {row.stay.check_in} → {row.stay.check_out}</small></div><strong>+{euro(row.ledger.uplift_vs_ota_cents)}</strong></summary>
              <div className={styles.economics}>
                <div><span>Gross</span><b>{euro(row.ledger.gross_cents)}</b></div>
                <div><span>Perk cost</span><b>−{euro(row.ledger.inkind_cost_cents)}</b></div>
                <div><span>Parley fee</span><b>−{euro(row.ledger.platform_fee_cents)}</b></div>
                <div><span>Hotel net</span><b>{euro(row.ledger.net_cents)}</b></div>
                <div><span>OTA net</span><b>{euro(row.ledger.ota_net_at_rack_cents)}</b></div>
              </div>
            </details>)}
        </section>
        <section className={styles.card}>
          <h2>Agent activity</h2><div className={styles.subtle}>Last 200 redacted page-tool calls.</div>
          {!calls.length ? <p className={styles.empty}>No WebMCP activity recorded yet.</p> : calls.slice(0, 20).map((call) =>
            <div className={styles.call} key={call.id}><i className={call.ok ? "" : styles.bad}></i><code>{call.tool}</code><span>{call.latency_ms}ms</span></div>)}
        </section>
      </div>
    </div>
  </main>;
}
