import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

import "./globals.css";

const fraunces = localFont({
  src: [
    {
      path: "./fonts/fraunces-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-italic-latin.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const plexSans = localFont({
  src: "./fonts/ibm-plex-sans-latin.woff2",
  weight: "400 600",
  style: "normal",
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const plexMono = localFont({
  src: "./fonts/ibm-plex-mono-latin.woff2",
  weight: "500",
  style: "normal",
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Lumina — Car wash, simplified",
    template: "%s · Lumina",
  },
  description:
    "Compare trusted car wash partners in Accra, see prices before you book, and choose a time that fits your day.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#100048" },
    { media: "(prefers-color-scheme: light)", color: "#efeeff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
