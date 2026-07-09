/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@opsedge360/shared-types'],
};

module.exports = nextConfig;
