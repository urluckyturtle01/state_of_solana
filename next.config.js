/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  // This ensures Vercel properly processes all pages
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Disable static export to support API routes
  // Don't change output to 'export' for Vercel deployment with API routes
};

module.exports = nextConfig;