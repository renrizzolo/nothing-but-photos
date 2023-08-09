"use client";
import { TransitionProvder } from "@/components/ViewTransition";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GridProvider } from "@/components/Grid";

import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nothing But Photos",
  description: "Nothing But Photos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <meta name="view-transition" content="same-origin" />
      <body className={`${inter.className} overflow-hidden`}>
        <GridProvider>
          <TransitionProvder>{children}</TransitionProvder>
        </GridProvider>
      </body>
    </html>
  );
}
