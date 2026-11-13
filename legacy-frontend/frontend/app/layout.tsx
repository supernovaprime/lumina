import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

const display = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  weight: "600 800",
  style: "normal",
  variable: "--font-bricolage",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const sans = localFont({
  src: "./fonts/ibm-plex-sans-latin.woff2",
  weight: "400 600",
  style: "normal",
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const mono = localFont({
  src: "./fonts/ibm-plex-mono-latin.woff2",
  weight: "500",
  style: "normal",
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["Consolas", "monospace"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: {
    default: "Lumina — Cleaner Cars. Brighter Days.",
    template: "%s | Lumina",
  },
  description:
    "Compare verified car wash partners in Accra, see prices before you book, and choose a time that fits your day.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Lumina — Cleaner Cars. Brighter Days.",
    description:
      "Compare verified car wash partners in Accra and book a time that fits your day.",
    images: ["/assets/logo-mark.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#16140F" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
