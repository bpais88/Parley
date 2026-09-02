import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

const documents = { rfc: "RFC.md", level0: "LEVEL0.md", integration: "INTEGRATION.md" } as const;

export function generateStaticParams() {
  return Object.keys(documents).map((slug) => ({ slug }));
}

function inline(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => part.startsWith("`") && part.endsWith("`")
    ? <code key={index}>{part.slice(1, -1)}</code>
    : part);
}

function renderMarkdown(markdown: string) {
  const blocks: React.ReactNode[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  const flush = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "))}</p>);
    if (list.length) blocks.push(<ul key={`u-${blocks.length}`}>{list.map((item) => <li key={item}>{inline(item)}</li>)}</ul>);
    paragraph = [];
    list = [];
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        blocks.push(<pre key={`c-${blocks.length}`}><code>{code.join("\n")}</code></pre>);
        code = null;
      } else {
        flush();
        code = [];
      }
    } else if (code) {
      code.push(line);
    } else if (line.startsWith("# ")) {
      flush(); blocks.push(<h1 key={`h1-${blocks.length}`}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flush(); blocks.push(<h2 key={`h2-${blocks.length}`}>{line.slice(3)}</h2>);
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush(); list.push(line.slice(2));
    } else if (/^\d+\. /.test(line)) {
      if (paragraph.length) flush(); list.push(line.replace(/^\d+\. /, ""));
    } else if (!line.trim()) {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export default async function DocsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in documents)) notFound();
  const filename = documents[slug as keyof typeof documents];
  const markdown = await readFile(path.join(process.cwd(), "..", "..", "docs", filename), "utf8");
  return <main className={styles.page}>
    <nav className={styles.nav}><Link href="/">PARLEY</Link><div><Link href="/docs/rfc">RFC</Link><Link href="/docs/level0">Level 0</Link><Link href="/docs/integration">Integration</Link></div></nav>
    <article className={styles.article}>{renderMarkdown(markdown)}</article>
  </main>;
}
