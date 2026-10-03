import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import { SPLIT_RESTORE_SCRIPT } from "@/lib/split-storage";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const env = process.env.NODE_ENV;

const envMap = {
  development: "dev",
  test: "test",
  production: "",
};

const envPrefix = envMap[env] ? `[${envMap[env]}] ` : "";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${envPrefix}${SITE_TITLE}`,
    template: `${envPrefix}%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_AUTHOR }],
  openGraph: {
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: SPLIT_RESTORE_SCRIPT }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
