/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb', // accommodate multi-file invoice uploads
    },
  },
};

module.exports = nextConfig;
