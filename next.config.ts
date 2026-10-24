import type { NextConfig } from "next";

const cloud = process.env.CLOUDINARY_CLOUD_NAME;

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // avatars are served from this cloud only (next/image)
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: cloud ? `/${cloud}/**` : "/**" }],
  },
  // the OG rank card reads Inter from disk at runtime; make sure it ships with the serverless bundle
  outputFileTracingIncludes: { "/api/card/[userId]": ["./assets/fonts/**"] },
};

export default nextConfig;
