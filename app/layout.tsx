// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ClientHydration from "./components/ClientHydration";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Base URL for all relative OG/twitter image URLs
  metadataBase: new URL("https://research.topledger.xyz"),

  title: "Top Ledger Research",
  description: "Real-time analytics and metrics dashboard for the Solana blockchain",
  keywords: [
    "Solana",
    "Blockchain",
    "Analytics",
    "Metrics",
    "Dashboard",
    "DeFi",
    "Cryptocurrency",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },

  openGraph: {
    title: "Top Ledger Research",
    description: "Real-time analytics and metrics dashboard for the Solana blockchain",
    url: "/dashboard",            // will resolve against metadataBase
    siteName: "Top Ledger Research",
    type: "website",
    images: [
      {
        url: "/twittercard.png",  // will resolve against metadataBase
        width: 1200,
        height: 630,
        alt: "Top Ledger Research",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Top Ledger Research",
    description: "Real-time analytics and metrics dashboard for the Solana blockchain",
    // Must be a Twitter handle, not a URL
    site: "@TopLedgerResearch",
    // (Optional) who created the content
    creator: "@TopLedgerResearch",
    images: ["/twittercard.png"],  // will resolve against metadataBase
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased min-h-screen bg-black text-gray-100`}
      >
        <ClientHydration />
        {children}
      </body>
    </html>
  );
}
