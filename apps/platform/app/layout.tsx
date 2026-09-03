import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  description:
    "Win more direct hotel bookings with offers made on your terms, while you keep control of every important decision.",
  title: "Parley — More direct hotel bookings",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
