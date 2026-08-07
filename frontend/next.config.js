/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_TELEMETRY_DISABLED: "1" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.in" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.media-amazon.com" },
      { protocol: "https", hostname: "**.flipkart.com" },
      { protocol: "https", hostname: "**.fkimg.com" },
      { protocol: "https", hostname: "**.flixcart.com" },
      { protocol: "https", hostname: "**.ajio.com" },
      { protocol: "https", hostname: "**.snapdeal.com" },
      { protocol: "https", hostname: "**.croma.com" },
    ],
  },
};
module.exports = nextConfig;
