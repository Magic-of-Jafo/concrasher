/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'convention-crasher.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    transpilePackages: ['@panva/hkdf', 'jose', 'next-auth', 'preact', 'preact-render-to-string', 'uuid'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Completely disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript build errors during deployment
    ignoreBuildErrors: true,
  },
  // Additional webpack config to ensure ESLint is bypassed
  webpack: (config, { isServer }) => {
    // Disable ESLint webpack plugin
    const eslintPlugin = config.plugins.find(
      (plugin) => plugin.constructor.name === 'ESLintWebpackPlugin'
    );
    if (eslintPlugin) {
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
    }
    return config;
  },
};

module.exports = nextConfig; 