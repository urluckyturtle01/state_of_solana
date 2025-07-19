/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  // Enable gzip compression for better performance
  compress: true,
  // This ensures Vercel properly processes all pages
  experimental: {
    serverComponentsExternalPackages: [],
    // Increase limit for large chart data files
    largePageDataBytes: 20 * 1024 * 1024, // 20MB limit (up from default 128KB)
  },
  // Custom headers for additional compression and caching
  async headers() {
    return [
      {
        // Apply to all temp data files
        source: '/temp/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=7200, s-maxage=7200, immutable', // Cache for 2 hours with immutable flag
          },
          {
            key: 'X-Cache-Tag',
            value: 'chart-data',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        // Optimize compressed chart data files (.gz)
        source: '/temp/chart-data/:path*.gz',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=14400, s-maxage=14400, immutable', // Cache for 4 hours
          },
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'X-Cache-Tag',
            value: 'compressed-data',
          },
        ],
      },
      {
        // Apply to API routes that serve chart data
        source: '/api/temp-data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600', // Cache 30min, stale-while-revalidate 1hr
          },
          {
            key: 'X-Cache-Tag',
            value: 'api-data',
          },
        ],
      },
      {
        // Apply to API routes that serve chart configs
        source: '/api/temp-configs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
          },
        ],
      },
      {
        // Cache static assets (JS, CSS, images) for longer
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // Cache for 1 year
          },
        ],
      },
      {
        // Cache other static assets
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // Cache for 1 day
          },
        ],
      },
    ];
  },
  // Disable static export to support API routes
  // Don't change output to 'export' for Vercel deployment with API routes
};

module.exports = nextConfig;