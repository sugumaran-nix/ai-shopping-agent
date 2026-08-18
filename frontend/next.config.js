/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazon.in' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: '**.flipkart.com' },
      { protocol: 'https', hostname: 'rukminim*.flixcart.com' },
      { protocol: 'https', hostname: '**.meesho.com' },
      { protocol: 'https', hostname: '**.myntra.com' },
      { protocol: 'https', hostname: '**.jiomart.com' },
      { protocol: 'https', hostname: '**.jiomartjcp.com' },
    ],
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' http://localhost:8000 https://*.onrender.com" },
        ],
      },
    ]
  },
}
module.exports = nextConfig
