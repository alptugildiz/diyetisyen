import type { NextConfig } from "next";

// Docker: BACKEND_URL=http://backend:5000 | Manuel: http://localhost:5000
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5000";

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
  // Proxy backend API routes to Express.
  // /api/auth/* is intentionally excluded — handled by NextAuth route handler.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/api/posts/:path*",
          destination: `${BACKEND}/api/posts/:path*`,
        },
        {
          source: "/api/faqs/:path*",
          destination: `${BACKEND}/api/faqs/:path*`,
        },
        {
          source: "/api/admin/:path*",
          destination: `${BACKEND}/api/admin/:path*`,
        },
        {
          source: "/api/health",
          destination: `${BACKEND}/api/health`,
        },
        {
          source: "/uploads/:path*",
          destination: `${BACKEND}/uploads/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
