/** @type {import('next').NextConfig} */
const BASE = process.env.NEXT_BASE_PATH || ''

const nextConfig = {
  output: 'standalone',
  basePath: BASE,
  assetPrefix: BASE,
  async rewrites() {
    return [
      {
        source: `${BASE}/api/:path*`,
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
