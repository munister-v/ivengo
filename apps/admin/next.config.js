/** @type {import('next').NextConfig} */
const BASE = process.env.NEXT_BASE_PATH || ''

const nextConfig = {
  output: 'standalone',
  basePath: BASE,
  assetPrefix: BASE,
  // Expose basePath to client code (api 401 redirect, auth helpers).
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE,
  },
  async rewrites() {
    return [
      {
        source: `${BASE}/api/:path*`,
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
  // Stop the browser from serving a stale HTML document after a redeploy.
  // Hashed assets under /_next/static stay immutable (handled by nginx); the
  // HTML shell must always be revalidated so it points at the newest chunks.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
