/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/state_of_solana' : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? '/state_of_solana' : '',
  distDir: 'out',
  reactStrictMode: false,
  swcMinify: true,
};

module.exports = nextConfig;