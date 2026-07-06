/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['convention-crasher.s3.us-east-1.amazonaws.com'],
  },
  experimental: {
    transpilePackages: ['@panva/hkdf', 'jose', 'next-auth', 'preact', 'preact-render-to-string', 'uuid'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Native module (ships a .node binary webpack can't bundle): load it from
    // node_modules at runtime instead. Used by the scraper helpers to render
    // scanned PDFs for the vision model.
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
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
  webpack: (config, { isServer, dev }) => {
    // @napi-rs/canvas ships a native .node binary webpack can't parse; resolve
    // it from node_modules at runtime (belt-and-suspenders alongside
    // experimental.serverComponentsExternalPackages above).
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@napi-rs/canvas');
    }

    // Disable ESLint webpack plugin
    const eslintPlugin = config.plugins.find(
      (plugin) => plugin.constructor.name === 'ESLintWebpackPlugin'
    );
    if (eslintPlugin) {
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
    }

    // Fix for HMR polling
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
};

module.exports = nextConfig; 