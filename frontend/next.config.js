/** @type {import('next').NextConfig} */
const rawBackend = process.env.BACKEND_URL || 'http://localhost:4000';
const BACKEND = rawBackend.replace(/\/+$/, '');

module.exports = {
  reactStrictMode: true,
  // Proxy /api/* to the Express API so the browser never makes cross-origin calls
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND}/:path*` }];
  },
};
