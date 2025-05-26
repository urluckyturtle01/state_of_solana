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
    description: 'Real-time analytics and insights for the Solana ecosystem',
    type: 'website',
    url: 'https://topledger.xyz',
    siteName: 'Top Ledger Research',
    images: [
      {
        url: 'https://topledger.xyz/api/og',
        width: 1200,
        height: 630,
        alt: 'Top Ledger Research Dashboard',
        type: 'image/png',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Ledger Research',
    description: 'Real-time analytics and insights for the Solana ecosystem',
    creator: '@TopLedger_xyz',
    images: {
      url: 'https://topledger.xyz/api/og',
      alt: 'Top Ledger Research - Analytics Dashboard'
    }
  },
  metadataBase: new URL('https://topledger.xyz'),
  keywords: ['Solana', 'Blockchain Analytics', 'DeFi Research', 'Crypto Metrics', 'Top Ledger', 'Web3 Analytics'],
  authors: [{ name: 'Top Ledger Research' }],
  creator: 'Top Ledger Research',
  publisher: 'Top Ledger',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  themeColor: '#000000'
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
