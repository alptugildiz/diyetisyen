import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  // Allow images from any hostname (update to specific domains in production)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // API proxy is handled via app/api/[...proxy]/route.ts at runtime.
  // This reads BACKEND_URL env var at request time, not build time.
};

export default nextConfig;
