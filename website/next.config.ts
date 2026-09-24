import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode Next.js logo overlay has no custom-icon option (see devIndicators docs) —
  // disabled outright so it doesn't show the generic Next.js mark over our branded UI.
  devIndicators: false,
  images: {
    // Product images are seller-uploaded (S3/Cloudinary per the plan) with URLs not known
    // ahead of time; restrict this to your actual asset host(s) before production.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
