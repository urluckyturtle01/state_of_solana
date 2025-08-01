import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ClientHydration from "./components/ClientHydration";
import AuthWrapper from "./components/auth/AuthWrapper";
import SaveNotification from "./components/shared/SaveNotification";
import AnalyticsProvider from "./components/analytics/AnalyticsProvider";
import NewsletterSection from "./components/shared/NewsletterSection";

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

const BASE_URL = "https://research.topledger.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
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
  verification: {
    google: "lzejPBZ2R1K7N81KQzA5Tdl_JNVlY-yNzkTpRca3Q0U",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "https://topledger.xyz/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Top Ledger Research",
    description: "Real-time analytics and metrics dashboard for the Solana blockchain",
    url: "/dashboard",
    siteName: "Top Ledger Research",
    type: "website",
    images: [
      {
        url: new URL("https://research.topledger.xyz/twittercard.png", BASE_URL).toString(),
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
    site: "@ledger_top",
    creator: "@ledger_top",
    images: [new URL("https://research.topledger.xyz/twittercard.png", BASE_URL).toString()],
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
        <AnalyticsProvider>
        <AuthWrapper>
          {children}
          <NewsletterSection /> 
          <SaveNotification />
        </AuthWrapper>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
