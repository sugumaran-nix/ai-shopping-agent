/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Opt out of telemetry in production
  ...(process.env.NODE_ENV === "production" && {
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  }),
  images: {
    // Allow product images from all e-commerce domains
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.com" },
      { protocol: "https", hostname: "**.amazon.in" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.media-amazon.com" },
      { protocol: "https", hostname: "**.flipkart.com" },
      { protocol: "https", hostname: "**.fkimg.com" },
      { protocol: "https", hostname: "**.flixcart.com" },
      { protocol: "https", hostname: "**.ebayimg.com" },
      { protocol: "https", hostname: "**.meesho.com" },
      { protocol: "https", hostname: "**.meesho.net" },
      { protocol: "https", hostname: "**.myntra.com" },
      { protocol: "https", hostname: "**.myntassets.com" },
    ],
  },
};

module.exports = nextConfig;
