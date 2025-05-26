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
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  title: "Top Ledger Research",
  description: "Top Ledger Research",
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: 'https://topledger.xyz/favicon.svg', type: 'image/svg+xml' }
    ],
  },
  openGraph: {
    title: 'Top Ledger Research',
    description: 'Real-time analytics and metrics dashboard for the Solana blockchain',
    type: 'website',
    url: 'https://research.topledger.xyz',
    siteName: 'Top Ledger Research',
    images: [
      {
        url: 'https://research.topledger.xyz/twittercard.jpg',
        width: 1200,
        height: 630,
        alt: 'Top Ledger Research'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Ledger Research',
    description: 'Real-time analytics and metrics dashboard for the Solana blockchain',
    site: 'https://research.topledger.xyz',
    images: ['https://research.topledger.xyz/twittercard.jpg']
  },
  metadataBase: new URL('https://research.topledger.xyz'),
  robots: {
    index: true,
    follow: true
  },
  keywords: ['Solana', 'Blockchain', 'Analytics', 'Metrics', 'Dashboard', 'DeFi', 'Cryptocurrency']
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
