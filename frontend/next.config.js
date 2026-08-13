/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazon.in' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: '**.flipkart.com' },
      { protocol: 'https', hostname: '**.meesho.com' },
      { protocol: 'https', hostname: '**.myntra.com' },
      { protocol: 'https', hostname: '**.ebayimg.com' },
      { protocol: 'https', hostname: '**.ebay.com' },
    ],
  },
}
module.exports = nextConfig
