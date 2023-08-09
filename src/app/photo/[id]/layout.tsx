"use client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nothing But Photos",
  description: "Nothing But Photos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="p-12 sm:p-24">{children}</div>;
}
