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
    serverComponentsExternalPackages: ['dotenv'],
    // Increase limit for large chart data files
    largePageDataBytes: 20 * 1024 * 1024, // 20MB limit (up from default 128KB)
    // Include Helium SQL + catalog assets in serverless traces (non-Vercel / local prod)
    outputFileTracingIncludes: {
      '/helium-apis': ['./queries/sql/**/*.sql', './queries/app/catalog/**', './queries/app/helium-apis-pages.js'],
      '/helium-apis/[group]/[name]': ['./queries/sql/**/*.sql', './queries/app/catalog/**', './queries/app/helium-apis-pages.js'],
      '/api/helium/[group]/[name]': ['./queries/sql/**/*.sql', './queries/pipeline/**'],
    },
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
            value: 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
          },
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
        ],
      },
      {
        // Apply to API routes that serve chart data
        source: '/api/temp-data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=1800, s-maxage=1800', // Cache for 30 minutes
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
    ];
  },
  // Disable static export to support API routes
  // Don't change output to 'export' for Vercel deployment with API routes
};

module.exports = nextConfig;