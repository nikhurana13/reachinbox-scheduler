/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

module.exports = {
  reactStrictMode: true,
  // Proxy /api/* to the Express API so the browser never makes cross-origin calls
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND}/:path*` }];
  },
};
