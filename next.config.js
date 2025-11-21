/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Enable standalone output for Docker
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Fix for better-sqlite3
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  // Allow serving generated images from data directory
  async rewrites() {
    return [
      {
        source: '/generated/:path*',
        destination: '/api/images/serve/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
