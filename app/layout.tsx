import { SPLIT_RESTORE_SCRIPT } from "@/lib/split-storage";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const env = process.env.NODE_ENV;

const envMap = {
  development: "dev",
  test: "test",
  production: "",
};

export const metadata: Metadata = {
  title: `${envMap[env] ? `[${envMap[env]}] ` : ""}Daily LeetCode - by Vítor Belim`,
  description:
    "A blog to keep track of daily LeetCode challenges, with solutions by Vítor Belim.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: SPLIT_RESTORE_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
