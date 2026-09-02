import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">Parley</p>
      <h1>WebMCP runtime proof</h1>
      <p className="lede">
        Product work begins only after the browser can discover and call the test tool.
      </p>
      <Link className="button" href="/g0">
        Open Gate 0
      </Link>
    </main>
  );
}
