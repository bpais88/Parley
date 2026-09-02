import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">Parley · WebMCP Challenge</p>
      <h1>The hotel website can finally negotiate.</h1>
      <p className="lede">
        A guest&apos;s agent holds rooms and negotiates inside the commission a hotel would
        otherwise pay an OTA. The final decision stays in the guest&apos;s hands.
      </p>
      <div className="actions">
        <Link className="button" href="/demo">Open the demo hotel</Link>
        <Link className="text-link" href="/g0">View runtime proof</Link>
      </div>
    </main>
  );
}
