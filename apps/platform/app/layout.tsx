import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  description:
    "Parley turns hotel websites into agent-ready direct-booking channels with deterministic negotiation and human-only acceptance.",
  title: "Parley — Negotiable direct booking",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
