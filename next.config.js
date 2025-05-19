/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Server-side rendering with API routes
  // output: 'export', // Disabled static export to use API routes
  images: {
    unoptimized: true,
  },
  // Use regular Next.js with server-side rendering
  reactStrictMode: false,
  
};

module.exports = nextConfig;