/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    transpilePackages: ['@panva/hkdf', 'jose', 'next-auth', 'preact', 'preact-render-to-string', 'uuid'],
  },
};

module.exports = nextConfig; 