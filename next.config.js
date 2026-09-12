/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow simple-peer (which uses Node.js built-ins) to run correctly
  serverExternalPackages: ['simple-peer'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.leetcode.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
};

module.exports = nextConfig;
