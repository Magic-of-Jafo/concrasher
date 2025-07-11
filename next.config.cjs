/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    transpilePackages: ['@panva/hkdf', 'jose', 'next-auth', 'preact', 'preact-render-to-string', 'uuid'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Disable ESLint during build for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript build errors during deployment
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 